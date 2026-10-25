import csv
import mimetypes
import os
from datetime import datetime, time

from django.conf import settings
from django.core.mail import EmailMessage
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.http import FileResponse, HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from submissions.models import Submission, SubmissionNote

from .auth import error, json_body, staff_required
from .serializers import STATUS_LABELS, note_dict, submission_dict

ORDERINGS = {"created_at", "-created_at", "name", "-name", "status", "-status"}


def filtered(params, ignore_status=False):
    qs = Submission.objects.all()
    kinds = [k for k in params.get("kind", "").split(",") if k in Submission.Kind.values]
    if kinds:
        qs = qs.filter(kind__in=kinds)
    status = params.get("status", "")
    if status in Submission.Status.values and not ignore_status:
        qs = qs.filter(status=status)
    q = params.get("q", "").strip()
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(email__icontains=q) | Q(organisation__icontains=q) | Q(message__icontains=q) | Q(details__role__icontains=q))
    start, end = parse_date(params.get("date_from", "")), parse_date(params.get("date_to", ""))
    tz = timezone.get_current_timezone()
    if start:
        qs = qs.filter(created_at__gte=timezone.make_aware(datetime.combine(start, time.min), tz))
    if end:
        qs = qs.filter(created_at__lte=timezone.make_aware(datetime.combine(end, time.max), tz))
    ordering = params.get("ordering", "-created_at")
    return qs.order_by(ordering if ordering in ORDERINGS else "-created_at", "-id")


@csrf_exempt
@staff_required
@require_GET
def submission_list(request):
    params = request.GET
    qs = filtered(params).select_related("payment")
    try:
        size = min(max(int(params.get("page_size", 20)), 1), 100)
        page_number = max(int(params.get("page", 1)), 1)
    except ValueError:
        size, page_number = 20, 1
    page = Paginator(qs, size).get_page(page_number)

    counts = {s: 0 for s in Submission.Status.values}
    counts.update({r["status"]: r["n"] for r in filtered(params, ignore_status=True).order_by().values("status").annotate(n=Count("id"))})
    counts["all"] = sum(counts.values())

    return JsonResponse({
        "ok": True,
        "results": [submission_dict(s) for s in page.object_list],
        "count": page.paginator.count,
        "page": page.number,
        "pages": page.paginator.num_pages,
        "page_size": size,
        "counts": counts,
    })


@csrf_exempt
@staff_required
@require_http_methods(["GET", "PATCH", "DELETE"])
def submission_detail(request, pk):
    sub = Submission.objects.select_related("payment").filter(pk=pk).first()
    if sub is None:
        return error("Submission not found.", 404)

    if request.method == "DELETE":
        sub.delete()
        return JsonResponse({"ok": True})

    if request.method == "PATCH":
        data = json_body(request) or {}
        status = data.get("status")
        if status not in Submission.Status.values:
            return error("Invalid status.", 400)
        if status != sub.status:
            old = STATUS_LABELS[sub.status]
            sub.status = status
            sub.save(update_fields=["status"])
            SubmissionNote.objects.create(
                submission=sub, author=request.staff_user, kind="note", text=f"Status changed from {old} to {STATUS_LABELS[status]}."
            )
    return JsonResponse({"ok": True, "submission": submission_dict(sub, detail=True)})


@csrf_exempt
@staff_required
@require_GET
def submission_photo(request, pk):
    sub = Submission.objects.filter(pk=pk).first()
    if sub is None or not sub.photo:
        return error("Photo not found.", 404)
    try:
        response = FileResponse(
            sub.photo.open("rb"),
            content_type=mimetypes.guess_type(sub.photo.name)[0] or "application/octet-stream",
        )
    except (FileNotFoundError, OSError):
        return error("Photo file is not available.", 404)
    filename = os.path.basename(sub.photo.name).replace('"', "")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


@csrf_exempt
@staff_required
@require_POST
def decision(request, pk):
    sub = Submission.objects.select_related("payment").filter(pk=pk).first()
    if sub is None:
        return error("Submission not found.", 404)
    data = json_body(request) or {}
    status = data.get("status")
    if status not in {Submission.Status.APPROVED, Submission.Status.WAITLISTED, Submission.Status.DECLINED}:
        return error("Choose an approved, waitlisted or declined decision.", 400)
    message = str(data.get("message", "")).strip()[:8000]
    default_messages = {
        Submission.Status.APPROVED: "We are pleased to confirm that your application has been approved for AIPIS 2027. Our team will share the next steps with you shortly.",
        Submission.Status.WAITLISTED: "Your application has been placed on the AIPIS 2027 waitlist. We will contact you as soon as a place becomes available.",
        Submission.Status.DECLINED: "Thank you for your interest in AIPIS 2027. After careful consideration, we are unable to proceed with your application at this time.",
    }
    body = message or default_messages[status]
    sender = request.staff_user.get_full_name() or request.staff_user.username
    subject = f"AIPIS 2027 application update: {Submission.Status(status).label}"
    try:
        EmailMessage(
            subject=subject,
            body=f"Dear {sub.name},\n\n{body}\n\n--\n{sender}\nAIPIS Secretariat\n{settings.NOTIFY_EMAIL}",
            to=[sub.email],
            reply_to=[settings.NOTIFY_EMAIL],
        ).send(fail_silently=False)
    except Exception:
        return error("The decision email could not be sent. Check the email settings on the server.", 502)

    sub.status = status
    sub.save(update_fields=["status"])
    note = SubmissionNote.objects.create(
        submission=sub,
        author=request.staff_user,
        kind="reply",
        text=f"{subject}\n\n{body}",
    )
    return JsonResponse({"ok": True, "submission": submission_dict(sub, detail=True), "note": note_dict(note)})


@csrf_exempt
@staff_required
@require_POST
def add_note(request, pk):
    sub = Submission.objects.select_related("payment").filter(pk=pk).first()
    if sub is None:
        return error("Submission not found.", 404)
    text = str((json_body(request) or {}).get("text", "")).strip()[:4000]
    if not text:
        return error("Please write a note first.", 400)
    note = SubmissionNote.objects.create(submission=sub, author=request.staff_user, kind="note", text=text)
    return JsonResponse({"ok": True, "note": note_dict(note)}, status=201)


@csrf_exempt
@staff_required
@require_POST
def reply(request, pk):
    sub = Submission.objects.select_related("payment").filter(pk=pk).first()
    if sub is None:
        return error("Submission not found.", 404)
    data = json_body(request) or {}
    subject = str(data.get("subject", "")).strip()[:200]
    body = str(data.get("body", "")).strip()[:8000]
    if not subject or not body:
        return error("Please enter a subject and a message.", 400)

    sender = request.staff_user.get_full_name() or request.staff_user.username
    try:
        EmailMessage(
            subject=subject,
            body=f"{body}\n\n--\n{sender}\nAIPIS Secretariat\n{settings.NOTIFY_EMAIL}",
            to=[sub.email],
            reply_to=[settings.NOTIFY_EMAIL],
        ).send(fail_silently=False)
    except Exception:
        return error("The email could not be sent. Check the email settings on the server.", 502)

    note = SubmissionNote.objects.create(submission=sub, author=request.staff_user, kind="reply", text=f"{subject}\n\n{body}")
    if sub.status == Submission.Status.NEW:
        sub.status = Submission.Status.IN_PROGRESS
        sub.save(update_fields=["status"])
    return JsonResponse({"ok": True, "note": note_dict(note), "status": sub.status})


@csrf_exempt
@staff_required
@require_POST
def bulk(request):
    data = json_body(request) or {}
    ids = [i for i in data.get("ids", []) if isinstance(i, int)][:500]
    action = data.get("action")
    qs = Submission.objects.filter(pk__in=ids)
    if action == "delete":
        count = qs.count()
        qs.delete()
    elif action == "status" and data.get("status") in Submission.Status.values:
        count = qs.update(status=data["status"])
    else:
        return error("Invalid action.", 400)
    return JsonResponse({"ok": True, "count": count})


def csv_safe(value):
    # Stop spreadsheet apps from running cells that start with a formula character
    value = str(value)
    return "'" + value if value[:1] in ("=", "+", "-", "@", "\t", "\r") else value


@csrf_exempt
@staff_required
@require_GET
def export_csv(request):
    qs = filtered(request.GET)[:10000]
    response = HttpResponse(content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="aipis-submissions.csv"'
    response.write("\ufeff")  # BOM so Excel reads UTF-8
    writer = csv.writer(response)
    writer.writerow(["ID", "Received", "Type", "Status", "Name", "Email", "Organisation", "Phone", "Details", "Message"])
    for s in qs:
        details = "; ".join(f"{k}: {v}" for k, v in s.details.items() if v)
        writer.writerow([s.pk, timezone.localtime(s.created_at).strftime("%Y-%m-%d %H:%M"), s.get_kind_display(),
                         s.get_status_display(), *map(csv_safe, [s.name, s.email, s.organisation, s.phone, details, s.message])])
    return response

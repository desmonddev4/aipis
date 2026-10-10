import json
import logging

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import Submission

logger = logging.getLogger(__name__)

# Extra fields accepted per kind, stored in Submission.details
ALLOWED_DETAILS = {
    "registration": ["category", "delegates", "country"],
    "partnership": ["package"],
    "technical": ["topic"],
    "poster": ["title"],
    "exhibitor": ["booths"],
    "forensic": ["project", "country"],
    "keynote": ["nominee"],
    "guest": ["nominee"],
}
MESSAGE_REQUIRED = {"contact", "forensic", "poster", "keynote", "guest", "technical"}


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return (forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR")) or None


def rate_limited(ip):
    key = f"submit-rate:{ip}"
    cache.add(key, 0, settings.SUBMISSION_RATE_WINDOW)
    try:
        count = cache.incr(key)
    except ValueError:
        count = 1
    return count > settings.SUBMISSION_RATE_LIMIT


def clean_text(value, max_len):
    return str(value or "").strip()[:max_len]


def notify(submission):
    lines = [
        f"Type: {submission.get_kind_display()}",
        f"Name: {submission.name}",
        f"Email: {submission.email}",
        f"Organisation: {submission.organisation or '-'}",
        f"Phone: {submission.phone or '-'}",
    ]
    lines += [f"{k.title()}: {v}" for k, v in submission.details.items() if v]
    lines += ["", submission.message or "(no message)"]
    EmailMessage(
        subject=f"[AIPIS 2027] {submission.get_kind_display()} from {submission.name}",
        body="\n".join(lines),
        to=[settings.NOTIFY_EMAIL],
        reply_to=[submission.email],
    ).send(fail_silently=False)


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_POST
def submit(request):
    try:
        data = json.loads(request.body or b"{}")
        if not isinstance(data, dict):
            raise ValueError
    except ValueError:
        return JsonResponse({"ok": False, "errors": {"__all__": "Invalid request."}}, status=400)

    # Honeypot: real users never fill this hidden field
    if data.get("website"):
        return JsonResponse({"ok": True})

    ip = client_ip(request)
    if rate_limited(ip):
        return JsonResponse(
            {"ok": False, "errors": {"__all__": "Too many submissions. Please try again later."}},
            status=429,
        )

    kind = data.get("kind")
    if kind not in Submission.Kind.values:
        return JsonResponse({"ok": False, "errors": {"kind": "Unknown form type."}}, status=400)

    errors = {}
    name = clean_text(data.get("name"), 120)
    email = clean_text(data.get("email"), 254)
    message = clean_text(data.get("message"), 4000)

    if not name:
        errors["name"] = "Please enter your name."
    try:
        validate_email(email)
    except ValidationError:
        errors["email"] = "Please enter a valid email address."
    if kind in MESSAGE_REQUIRED and not message:
        errors["message"] = "Please add a message."
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    details = {key: clean_text(data.get(key), 200) for key in ALLOWED_DETAILS.get(kind, [])}
    submission = Submission.objects.create(
        kind=kind,
        name=name,
        email=email,
        organisation=clean_text(data.get("organisation"), 200),
        phone=clean_text(data.get("phone"), 40),
        message=message,
        details=details,
        ip_address=ip,
    )

    try:
        notify(submission)
    except Exception:
        # The submission is already saved; an email failure must not lose it
        logger.exception("Could not send notification for submission %s", submission.pk)

    return JsonResponse({"ok": True})

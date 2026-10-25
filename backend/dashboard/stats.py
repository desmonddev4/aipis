from collections import Counter
from datetime import timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET

from submissions.models import Submission
from submissions.constants import ACTIVE_APPLICATION_STATUSES, APPLICATION_CAPS

from .auth import staff_required
from .serializers import KIND_LABELS, STATUS_LABELS, submission_dict


def daily_series(qs, days):
    today = timezone.localdate()
    start = today - timedelta(days=days - 1)
    rows = qs.filter(created_at__date__gte=start).annotate(d=TruncDate("created_at")).values("d").annotate(n=Count("id"))
    counts = {r["d"]: r["n"] for r in rows}
    return [{"date": (start + timedelta(days=i)).isoformat(), "count": counts.get(start + timedelta(days=i), 0)} for i in range(days)]


def count_by(qs, field, labels):
    rows = {r[field]: r["n"] for r in qs.values(field).annotate(n=Count("id"))}
    return [{"key": k, "label": label, "count": rows.get(k, 0)} for k, label in labels.items()]


def to_int(value, default=1):
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return default


def top(counter, limit=8):
    return [{"label": k, "count": v} for k, v in counter.most_common(limit)]


@csrf_exempt
@staff_required
@require_GET
def badges(request):
    new = Submission.objects.filter(status=Submission.Status.NEW)
    by_kind = {r["kind"]: r["n"] for r in new.values("kind").annotate(n=Count("id"))}
    return JsonResponse({"ok": True, "new_total": sum(by_kind.values()), "new_by_kind": by_kind})


@csrf_exempt
@staff_required
@require_GET
def overview(request):
    qs = Submission.objects.all()
    now = timezone.now()
    last7 = qs.filter(created_at__gte=now - timedelta(days=7)).count()
    prev7 = qs.filter(created_at__gte=now - timedelta(days=14), created_at__lt=now - timedelta(days=7)).count()
    stale = qs.filter(status=Submission.Status.NEW, created_at__lt=now - timedelta(days=3))
    status_counts = {s["key"]: s["count"] for s in count_by(qs, "status", STATUS_LABELS)}
    capacity = {}
    for kind, limit in APPLICATION_CAPS.items():
        used = qs.filter(kind=kind, status__in=ACTIVE_APPLICATION_STATUSES).count()
        capacity[kind] = {
            "label": KIND_LABELS.get(kind, kind.title()),
            "limit": limit,
            "used": used,
            "remaining": max(limit - used, 0),
        }

    return JsonResponse({
        "ok": True,
        "total": qs.count(),
        "status": status_counts,
        "last7": last7,
        "prev7": prev7,
        "stale_new": stale.count(),
        "stale_items": [submission_dict(s) for s in stale.order_by("created_at")[:5]],
        "by_kind": count_by(qs, "kind", KIND_LABELS),
        "capacity": capacity,
        "daily": daily_series(qs, 30),
        "recent": [submission_dict(s) for s in qs.order_by("-created_at")[:8]],
    })


@csrf_exempt
@staff_required
@require_GET
def analytics(request):
    days = min(max(to_int(request.GET.get("days"), 30), 7), 365)
    since = timezone.now() - timedelta(days=days)
    qs = Submission.objects.filter(created_at__gte=since)

    regs = list(qs.filter(kind="registration"))
    categories, countries = Counter(), Counter()
    delegates = 0
    for r in regs:
        attendees = r.details.get("attendees")
        if isinstance(attendees, list) and attendees:
            delegates += len(attendees)
            for attendee in attendees:
                categories[attendee.get("category") or "Not specified"] += 1
                country = attendee.get("country", "").strip().title()
                if country:
                    countries[country] += 1
        else:
            categories[r.details.get("category") or "Not specified"] += 1
            delegates += to_int(r.details.get("delegates"))
            if r.details.get("country"):
                countries[r.details["country"].strip().title()] += 1

    packages = Counter((p.details.get("package") or "General enquiry") for p in qs.filter(kind="partnership"))
    booths = sum(to_int(e.details.get("booths")) for e in qs.filter(kind="exhibitor"))
    orgs = Counter(o for o in qs.exclude(organisation="").values_list("organisation", flat=True))

    total = qs.count()
    handled = qs.filter(status__in=[Submission.Status.HANDLED, Submission.Status.ARCHIVED]).count()

    return JsonResponse({
        "ok": True,
        "days": days,
        "total": total,
        "handled_rate": round(handled * 100 / total) if total else 0,
        "daily": daily_series(Submission.objects.all(), days),
        "by_kind": count_by(qs, "kind", KIND_LABELS),
        "by_status": count_by(qs, "status", STATUS_LABELS),
        "registrations": {"count": len(regs), "delegates": delegates, "categories": top(categories), "countries": top(countries)},
        "partnerships": {"count": sum(packages.values()), "packages": top(packages, 12)},
        "exhibitors": {"booths": booths},
        "top_organisations": top(orgs, 8),
    })

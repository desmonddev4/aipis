from django.contrib.auth import get_user_model

from submissions.models import Submission

User = get_user_model()


def iso(dt):
    return dt.isoformat() if dt else None


def user_dict(user):
    return {
        "id": user.pk,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
        "last_login": iso(user.last_login),
        "date_joined": iso(user.date_joined),
    }


def note_dict(note):
    return {
        "id": note.pk,
        "kind": note.kind,
        "text": note.text,
        "author": (note.author.get_full_name() or note.author.username) if note.author else "Deleted user",
        "created_at": iso(note.created_at),
    }


def submission_dict(s, detail=False):
    data = {
        "id": s.pk,
        "kind": s.kind,
        "kind_label": s.get_kind_display(),
        "name": s.name,
        "email": s.email,
        "organisation": s.organisation,
        "phone": s.phone,
        "details": s.details,
        "status": s.status,
        "status_label": s.get_status_display(),
        "created_at": iso(s.created_at),
        "message": s.message if detail else s.message[:160],
        "has_photo": bool(s.photo),
        "photo_name": s.photo.name.split("/")[-1] if s.photo else "",
    }
    if s.kind == Submission.Kind.REGISTRATION:
        payment = getattr(s, "payment", None)
        data["payment"] = {
            "status": payment.status,
            "status_label": payment.get_status_display(),
            "amount_ghs": str(payment.amount_ghs),
            "usd_amount": str(payment.usd_amount),
            "fx_rate": str(payment.fx_rate),
            "fx_rate_date": payment.fx_rate_date.isoformat(),
            "reference": payment.reference,
            "paid_at": iso(payment.paid_at),
        } if payment else None
    if detail:
        data["ip_address"] = s.ip_address
        data["notes"] = [note_dict(n) for n in s.notes.select_related("author")]
        data["photo_url"] = f"/submissions/{s.pk}/photo/" if s.photo else ""
    return data


KIND_LABELS = dict(Submission.Kind.choices)
STATUS_LABELS = dict(Submission.Status.choices)

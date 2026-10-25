import hashlib
import hmac
import json
import logging
import uuid
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from urllib.parse import urlencode

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .models import RegistrationPayment, Submission
from .constants import ACTIVE_APPLICATION_STATUSES, APPLICATION_CAPS
from .payments import PaymentError, get_bog_usd_ghs_rate, initialize_transaction, verify_transaction

logger = logging.getLogger(__name__)

ALLOWED_DETAILS = {
    "partnership": ["package"],
    "technical": ["role", "topic", "honorific", "title", "position", "country", "whatsapp", "bio"],
    "poster": ["role", "honorific", "title", "position", "country", "whatsapp", "bio"],
    "exhibitor": ["booths"],
    "forensic": ["project", "country"],
    "keynote": ["role", "honorific", "position", "country", "whatsapp", "bio"],
    "guest": ["role", "honorific", "position", "country", "whatsapp", "bio"],
    "panelist": ["role", "honorific", "position", "country", "whatsapp", "bio"],
    "roundtable": ["roundtable", "role", "country", "experience"],
}
MESSAGE_REQUIRED = {"contact", "forensic", "poster", "keynote", "guest", "panelist", "technical", "partnership", "exhibitor", "roundtable"}
ROUNDTABLES = {
    "Africa Infrastructure Bankability Roundtable",
    "Africa Infrastructure and Resource Diplomacy Roundtable",
    "Africa Infrastructure Maintainability Roundtable",
    "Africa Land, Traditional Authority and Infrastructure Roundtable (Africa Land TRAIR)",
}
PARTNERSHIP_PACKAGES = {
    "Founding Partner", "Prosperity Index Partner", "Strategic Partner", "Knowledge Partner",
    "Industry Partner", "Session Partner", "Gala Dinner Partner", "Field Day Partner",
    "Student and Young Professional Bursary Partner", "Delegate Kit and Digital Partner",
    "General partnership enquiry",
}
REGISTRATION_PRICES_USD = {
    "International delegate": (Decimal("750.00"), Decimal("640.00")),
    "African delegate (outside Ghana)": (Decimal("500.00"), Decimal("425.00")),
    "Ghanaian delegate": (Decimal("400.00"), Decimal("340.00")),
    "Public sector and university staff (Ghana)": (Decimal("350.00"), Decimal("300.00")),
    "Student or young professional (under 35)": (Decimal("200.00"), Decimal("170.00")),
    "Exhibitor": (Decimal("3000.00"), Decimal("3000.00")),
}
EARLY_REGISTRATION_DEADLINE = date(2027, 2, 28)


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


def send_email(subject, body, to, reply_to=None):
    EmailMessage(
        subject=subject,
        body=body,
        to=[to],
        reply_to=[reply_to] if reply_to else [],
    ).send(fail_silently=False)


def notify(submission):
    lines = [
        f"Type: {submission.get_kind_display()}",
        f"Name: {submission.name}",
        f"Email: {submission.email}",
        f"Organisation: {submission.organisation or '-'}",
        f"Phone: {submission.phone or '-'}",
    ]
    for key, value in submission.details.items():
        if key == "attendees" and isinstance(value, list):
            lines.append("Attendees:")
            for index, attendee in enumerate(value, 1):
                lines.append(
                    f"  {index}. {attendee.get('name', '')} | {attendee.get('email', '')} | {attendee.get('phone', '')} | "
                    f"{attendee.get('category', '')} | {attendee.get('country', '')}"
                )
        elif value:
            lines.append(f"{key.replace('_', ' ').title()}: {value}")
    payment = getattr(submission, "payment", None)
    if payment:
        lines += [
            "",
            f"Payment: {payment.get_status_display()}",
            f"Total: GHS {payment.amount_ghs} (USD {payment.usd_amount})",
            f"Bank of Ghana USD/GHS mid-rate: {payment.fx_rate} dated {payment.fx_rate_date}",
            f"Paystack reference: {payment.reference}",
        ]
    lines += ["", submission.message or "(no message)"]
    send_email(
        subject=f"[AIPIS 2027] {submission.get_kind_display()} from {submission.name}",
        body="\n".join(lines),
        to=settings.NOTIFY_EMAIL,
        reply_to=submission.email,
    )


def notify_applicant(submission):
    status_url = settings.FRONTEND_URL.rstrip("/") + "/application-status.html?token=" + str(submission.tracking_token)
    send_email(
        subject=f"AIPIS 2027 application received — {submission.get_kind_display()}",
        body=(
            f"Dear {submission.name},\n\n"
            f"Thank you for your {submission.get_kind_display().lower()} application to AIPIS 2027. "
            "We have received your details successfully and the secretariat will review your application. "
            "We will contact you with the outcome and any next steps.\n\n"
            f"You can check your application status at any time here:\n{status_url}\n\n"
            "Please keep this email for your records.\n\n"
            "AIPIS Secretariat\n"
            f"{settings.NOTIFY_EMAIL}"
        ),
        to=submission.email,
        reply_to=settings.NOTIFY_EMAIL,
    )


def notify_payment(payment):
    send_email(
        subject="[AIPIS 2027] Registration payment confirmed",
        body=(
            f"Registration #{payment.submission_id} for {payment.submission.name} has been paid.\n"
            f"Amount: GHS {payment.amount_ghs}\nUSD fee: {payment.usd_amount}\n"
            f"Bank of Ghana USD/GHS mid-rate: {payment.fx_rate} dated {payment.fx_rate_date}\n"
            f"Paystack reference: {payment.reference}"
        ),
        to=settings.NOTIFY_EMAIL,
        reply_to=payment.submission.email,
    )


def notify_payment_applicant(payment):
    submission = payment.submission
    status_url = settings.FRONTEND_URL.rstrip("/") + "/application-status.html?token=" + str(submission.tracking_token)
    send_email(
        subject="AIPIS 2027 payment confirmation",
        body=(
            f"Dear {submission.name},\n\n"
            f"Your payment for {submission.get_kind_display()} has been confirmed successfully.\n\n"
            f"Payment details:\n"
            f"Payment type: {submission.get_kind_display()}\n"
            f"Registration reference: {payment.reference}\n"
            f"Amount paid: {payment.amount_ghs} {payment.currency}\n"
            f"USD value: {payment.usd_amount}\n"
            f"Bank of Ghana USD/GHS rate: {payment.fx_rate} ({payment.fx_rate_date})\n"
            f"Payment date: {payment.paid_at.strftime('%d %B %Y, %H:%M UTC') if payment.paid_at else '-'}\n"
            f"Paystack transaction ID: {payment.paystack_transaction_id or '-'}\n\n"
            f"You can review your application status here:\n{status_url}\n\n"
            "Please keep this email as your payment receipt.\n\n"
            "AIPIS Secretariat\n"
            f"{settings.NOTIFY_EMAIL}"
        ),
        to=submission.email,
        reply_to=settings.NOTIFY_EMAIL,
    )


@require_GET
def application_status(request):
    token = clean_text(request.GET.get("token"), 36)
    submission = Submission.objects.filter(tracking_token=token).first()
    if submission is None:
        return JsonResponse({"ok": False, "error": "We could not find an application for that status link."}, status=404)
    return JsonResponse({
        "ok": True,
        "application": {
            "name": submission.name,
            "kind": submission.get_kind_display(),
            "status": submission.status,
            "status_label": submission.get_status_display(),
            "submitted_at": submission.created_at.isoformat(),
            "payment_status": getattr(getattr(submission, "payment", None), "status", ""),
            "payment_status_label": getattr(getattr(submission, "payment", None), "get_status_display", lambda: "")(),
        },
    })

def valid_email(value):
    try:
        validate_email(value)
        return True
    except ValidationError:
        return False


def frontend_result(status, registration_id=None):
    params = {"status": status}
    if registration_id:
        params["registration"] = registration_id
    return redirect(settings.FRONTEND_URL.rstrip("/") + "/registration-confirmation.html?" + urlencode(params))


def record_paid(payment, data):
    if (
        data.get("status") != "success"
        or data.get("reference") != payment.reference
        or data.get("currency") != payment.currency
        or int(data.get("amount") or 0) != payment.amount_kobo
    ):
        return False
    if payment.status != RegistrationPayment.Status.SUCCESS:
        payment.status = RegistrationPayment.Status.SUCCESS
        payment.paid_at = timezone.now()
        try:
            payment.paystack_transaction_id = int(data.get("id"))
        except (TypeError, ValueError):
            pass
        payment.save(update_fields=["status", "paid_at", "paystack_transaction_id", "updated_at"])
        try:
            notify_payment(payment)
        except Exception:
            logger.exception("Could not send payment notification for registration %s", payment.submission_id)
        try:
            notify_payment_applicant(payment)
        except Exception:
            logger.exception("Could not send payment confirmation to applicant for registration %s", payment.submission_id)
    return True


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@csrf_exempt
@require_POST
def registration_checkout(request):
    try:
        data = json.loads(request.body or b"{}")
        if not isinstance(data, dict):
            raise ValueError
    except ValueError:
        return JsonResponse({"ok": False, "error": "Invalid request."}, status=400)

    if data.get("website"):
        return JsonResponse({"ok": True})
    ip = client_ip(request)
    if rate_limited(ip):
        return JsonResponse({"ok": False, "error": "Too many attempts. Please try again later."}, status=429)
    if not settings.PAYSTACK_SECRET_KEY:
        return JsonResponse({"ok": False, "error": "Online payments are not configured yet. Please contact the secretariat."}, status=503)

    attendees = data.get("attendees")
    first_attendee = attendees[0] if isinstance(attendees, list) and attendees and isinstance(attendees[0], dict) else {}
    name = clean_text(first_attendee.get("name"), 120)
    email = clean_text(first_attendee.get("email"), 254)
    organisation = clean_text(data.get("organisation"), 200)
    phone = clean_text(first_attendee.get("phone"), 40)
    country = clean_text(first_attendee.get("country"), 100)
    errors = {}
    if not name:
        errors["name"] = "Please enter the first attendee's name."
    if not valid_email(email):
        errors["email"] = "Please enter a valid email address for the first attendee."
    if not country:
        errors["country"] = "Please enter the first attendee's country."
    if not phone:
        errors["phone"] = "Please enter a phone number for the first attendee."
    if data.get("consent") is not True:
        errors["consent"] = "Please agree to the privacy notice and registration terms."
    if not isinstance(attendees, list) or not 1 <= len(attendees) <= 50:
        errors["attendees"] = "Add between 1 and 50 attendees."
    cleaned_attendees = []
    exhibitor_applications_requested = 0
    if isinstance(attendees, list):
        for index, attendee in enumerate(attendees[:50]):
            if not isinstance(attendee, dict):
                errors[f"attendee_{index}"] = "Please check this attendee's details."
                continue
            attendee_name = clean_text(attendee.get("name"), 120)
            attendee_email = clean_text(attendee.get("email"), 254)
            attendee_phone = clean_text(attendee.get("phone"), 40)
            attendee_country = clean_text(attendee.get("country"), 100)
            category = clean_text(attendee.get("category"), 100)
            exhibitor_details = {}
            if not attendee_name:
                errors[f"attendee_name_{index}"] = f"Enter a name for attendee {index + 1}."
            if not valid_email(attendee_email):
                errors[f"attendee_email_{index}"] = f"Enter a valid email for attendee {index + 1}."
            if not attendee_phone:
                errors[f"attendee_phone_{index}"] = f"Enter a phone number for attendee {index + 1}."
            if category not in REGISTRATION_PRICES_USD:
                errors[f"attendee_category_{index}"] = f"Choose a category for attendee {index + 1}."
            if not attendee_country:
                errors[f"attendee_country_{index}"] = f"Enter a country for attendee {index + 1}."
            cleaned_attendee = {
                "name": attendee_name,
                "email": attendee_email,
                "phone": attendee_phone,
                "country": attendee_country,
                "category": category,
            }
            if category == "Exhibitor":
                exhibitor_applications_requested += 1
                exhibitor_details = {
                    "organisation": clean_text(attendee.get("organisation"), 200),
                    "website": clean_text(attendee.get("website"), 250),
                    "sector": clean_text(attendee.get("sector"), 120),
                    "space_sqm": clean_text(attendee.get("space_sqm"), 12),
                    "product_summary": clean_text(attendee.get("product_summary"), 2000),
                    "space_requirements": clean_text(attendee.get("space_requirements"), 1000),
                }
                if not exhibitor_details["organisation"]:
                    errors[f"attendee_organisation_{index}"] = f"Enter the organisation name for exhibitor {index + 1}."
                if not exhibitor_details["sector"]:
                    errors[f"attendee_sector_{index}"] = f"Enter the industry or sector for exhibitor {index + 1}."
                if not exhibitor_details["product_summary"]:
                    errors[f"attendee_product_summary_{index}"] = f"Describe what exhibitor {index + 1} will display."
                try:
                    space_sqm = Decimal(exhibitor_details["space_sqm"])
                    if not space_sqm.is_finite() or space_sqm < Decimal("1") or space_sqm > Decimal("1000"):
                        raise ValueError
                    exhibitor_details["space_sqm"] = format(space_sqm.normalize(), "f")
                except (InvalidOperation, TypeError, ValueError):
                    errors[f"attendee_space_sqm_{index}"] = f"Enter between 1 and 1,000 square metres for exhibitor {index + 1}."
                cleaned_attendee.update(exhibitor_details)
            cleaned_attendees.append(cleaned_attendee)
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    if exhibitor_applications_requested:
        active_registrations = Submission.objects.filter(
            kind=Submission.Kind.REGISTRATION,
            status__in=ACTIVE_APPLICATION_STATUSES,
        ).only("details")
        existing_exhibitor_applications = sum(
            sum(1 for attendee in (submission.details or {}).get("attendees", []) if attendee.get("category") == "Exhibitor")
            for submission in active_registrations
        )
        if existing_exhibitor_applications + exhibitor_applications_requested > 30:
            return JsonResponse({"ok": False, "errors": {"capacity": "Exhibitor applications are now full. The maximum of 30 applications has been reached."}}, status=409)

    today = timezone.localdate()
    early = today <= EARLY_REGISTRATION_DEADLINE
    subtotal_usd = sum(
        (REGISTRATION_PRICES_USD[attendee["category"]][1 if early else 0] * Decimal(attendee["space_sqm"])
         if attendee["category"] == "Exhibitor"
         else REGISTRATION_PRICES_USD[attendee["category"]][1 if early else 0])
        for attendee in cleaned_attendees
    )
    discount_usd = Decimal("0.00")
    if len(cleaned_attendees) >= 5 and not exhibitor_applications_requested:
        discount_usd = (subtotal_usd * Decimal("0.10")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    total_usd = subtotal_usd - discount_usd
    try:
        fx_rate, fx_date = get_bog_usd_ghs_rate()
    except PaymentError as exc:
        return JsonResponse({"ok": False, "error": str(exc)}, status=503)

    total_ghs = (total_usd * fx_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    amount_kobo = int((total_ghs * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    categories = {attendee["category"] for attendee in cleaned_attendees}
    details = {
        "category": next(iter(categories)) if len(categories) == 1 else "Multiple categories",
        "delegates": str(len(cleaned_attendees)),
        "exhibitor_applications": str(exhibitor_applications_requested),
        "country": country,
        "attendees": cleaned_attendees,
        "early_rate": "yes" if early else "no",
        "usd_subtotal": str(subtotal_usd),
        "group_discount_usd": str(discount_usd),
        "usd_total": str(total_usd),
        "currency": "GHS",
        "amount_ghs": str(total_ghs),
        "fx_rate": str(fx_rate),
        "fx_rate_date": fx_date.isoformat(),
    }
    submission = Submission.objects.create(
        kind=Submission.Kind.REGISTRATION,
        name=name,
        email=email,
        organisation=organisation or clean_text(first_attendee.get("organisation"), 200),
        phone=phone,
        details=details,
        ip_address=ip,
    )
    reference = f"AIPIS2027-{submission.pk}-{uuid.uuid4().hex[:12]}"
    payment = RegistrationPayment.objects.create(
        submission=submission,
        reference=reference,
        amount_kobo=amount_kobo,
        currency="GHS",
        usd_amount=total_usd,
        fx_rate=fx_rate,
        fx_rate_date=fx_date,
    )
    try:
        payment.authorization_url = initialize_transaction(payment, email, name)
        payment.save(update_fields=["authorization_url", "updated_at"])
    except PaymentError as exc:
        payment.status = RegistrationPayment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
        logger.warning("Paystack initialization failed for registration %s: %s", submission.pk, exc)
        return JsonResponse({"ok": False, "error": str(exc)}, status=502)
    except Exception:
        logger.exception("Could not initialize payment for registration %s", submission.pk)
        return JsonResponse({"ok": False, "error": "We could not start the payment. Please try again."}, status=502)

    try:
        notify(submission)
    except Exception:
        logger.exception("Could not send registration notification for %s", submission.pk)
    try:
        notify_applicant(submission)
    except Exception:
        logger.exception("Could not send registration confirmation for %s", submission.pk)
    return JsonResponse({
        "ok": True,
        "registration_id": submission.pk,
        "authorization_url": payment.authorization_url,
        "reference": payment.reference,
        "usd_amount": str(total_usd),
        "ghs_amount": str(total_ghs),
        "fx_rate": str(fx_rate),
        "fx_rate_date": fx_date.isoformat(),
        "discount_usd": str(discount_usd),
        "early_rate": early,
        "status_url": settings.FRONTEND_URL.rstrip("/") + "/application-status.html?token=" + str(submission.tracking_token),
    })


@csrf_exempt
@require_GET
def payment_callback(request):
    reference = clean_text(request.GET.get("reference"), 100)
    payment = RegistrationPayment.objects.select_related("submission").filter(reference=reference).first()
    if not payment:
        return frontend_result("failed")
    try:
        data = verify_transaction(reference)
    except PaymentError:
        logger.exception("Paystack verification unavailable for registration %s", payment.submission_id)
        return frontend_result("pending", payment.submission_id)
    if record_paid(payment, data):
        return frontend_result("success", payment.submission_id)
    if data.get("status") == "failed":
        payment.status = RegistrationPayment.Status.FAILED
        payment.save(update_fields=["status", "updated_at"])
        return frontend_result("failed", payment.submission_id)
    return frontend_result("pending", payment.submission_id)


@csrf_exempt
@require_POST
def payment_webhook(request):
    secret = settings.PAYSTACK_SECRET_KEY
    signature = request.headers.get("x-paystack-signature", "")
    digest = hmac.new(secret.encode("utf-8"), request.body, hashlib.sha512).hexdigest() if secret else ""
    if not secret or not hmac.compare_digest(signature, digest):
        return HttpResponse(status=400)
    try:
        event = json.loads(request.body or b"{}")
    except ValueError:
        return HttpResponse(status=400)
    if event.get("event") == "charge.success":
        data = event.get("data") or {}
        payment = RegistrationPayment.objects.select_related("submission").filter(reference=data.get("reference", "")).first()
        if payment and not record_paid(payment, data):
            logger.warning("Paystack webhook did not match registration payment %s", payment.submission_id)
    return HttpResponse(status=200)


@csrf_exempt
@require_POST
def submit(request):
    if request.content_type.startswith("multipart/"):
        data = request.POST
        photo = request.FILES.get("photo")
    else:
        try:
            data = json.loads(request.body or b"{}")
            if not isinstance(data, dict):
                raise ValueError
        except ValueError:
            return JsonResponse({"ok": False, "errors": {"__all__": "Invalid request."}}, status=400)
        photo = None

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
    if kind == Submission.Kind.REGISTRATION:
        return JsonResponse({"ok": False, "errors": {"__all__": "Please use the secure online registration form."}}, status=400)

    capacity = APPLICATION_CAPS.get(kind)
    if capacity is not None and Submission.objects.filter(kind=kind, status__in=ACTIVE_APPLICATION_STATUSES).count() >= capacity:
        return JsonResponse(
            {"ok": False, "errors": {"__all__": f"Applications for this role are now full. The maximum of {capacity} applications has been reached."}},
            status=409,
        )

    speaker_kinds = {Submission.Kind.KEYNOTE, Submission.Kind.GUEST, Submission.Kind.TECHNICAL, Submission.Kind.POSTER, Submission.Kind.PANELIST}
    if kind in speaker_kinds:
        role = clean_text(data.get("role"), 100)
        if not role:
            errors = {"role": "Please choose an application role."}
        else:
            errors = {}
        if not photo:
            errors["photo"] = "Please upload a professional photograph."
        elif photo.size > 5 * 1024 * 1024:
            errors["photo"] = "Please choose an image smaller than 5 MB."
        elif photo.content_type not in {"image/jpeg", "image/png", "image/webp"}:
            errors["photo"] = "Upload a JPG, PNG or WEBP image."
    else:
        errors = {}

    name = clean_text(data.get("name"), 120)
    email = clean_text(data.get("email"), 254)
    message = clean_text(data.get("message"), 4000)
    if not name:
        errors["name"] = "Please enter your name."
    if not valid_email(email):
        errors["email"] = "Please enter a valid email address."
    if kind in MESSAGE_REQUIRED and kind != "exhibitor" and not message:
        errors["message"] = "Please add a message."
    if kind in {"partnership", "exhibitor"}:
        if data.get("consent") not in (True, "on", "1", "true"):
            errors["consent"] = "Please agree to the registration terms and privacy notice."
        if not clean_text(data.get("organisation_type"), 80):
            errors["organisation_type"] = "Please select an organisation type."
        if not clean_text(data.get("country"), 100):
            errors["country"] = "Please enter your organisation's country."
        if kind == "partnership" and clean_text(data.get("package"), 100) not in PARTNERSHIP_PACKAGES:
            errors["package"] = "Choose a valid partnership package."
        if kind == "exhibitor":
            if clean_text(data.get("package"), 100) != "Exhibitor":
                errors["package"] = "Choose the exhibitor registration."
            try:
                booths = int(data.get("booths"))
                if not 1 <= booths <= 30:
                    raise ValueError
            except (TypeError, ValueError):
                errors["booths"] = "Request between 1 and 30 booths."
            if not clean_text(data.get("product_summary"), 2000):
                errors["product_summary"] = "Describe the products, services or projects you plan to exhibit."
    if kind == Submission.Kind.ROUNDTABLE:
        if data.get("consent") not in (True, "on"):
            errors["consent"] = "Please agree to the privacy notice before submitting."
        if not clean_text(data.get("role"), 120):
            errors["role"] = "Please enter your role or title."
        if not clean_text(data.get("country"), 100):
            errors["country"] = "Please enter your country."
        if clean_text(data.get("roundtable"), 120) not in ROUNDTABLES:
            errors["roundtable"] = "Choose a roundtable of interest."
        if not clean_text(data.get("experience"), 2500):
            errors["experience"] = "Tell us about your relevant experience."
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    details = {key: clean_text(data.get(key), 2500 if key in {"experience", "bio"} else 200) for key in ALLOWED_DETAILS.get(kind, [])}
    if kind == Submission.Kind.ROUNDTABLE:
        details.update({"role": clean_text(data.get("role"), 120), "consent": "Agreed"})
    if kind in {"partnership", "exhibitor"}:
        details.update({
            "organisation_type": clean_text(data.get("organisation_type"), 80),
            "country": clean_text(data.get("country"), 100),
            "website": clean_text(data.get("website"), 250),
            "consent": "Agreed",
        })
        if kind == "partnership":
            details["package"] = clean_text(data.get("package"), 100)
            details["proposal"] = clean_text(data.get("proposal"), 3000)
        else:
            details.update({
                "package": "Exhibitor",
                "booths": clean_text(data.get("booths"), 2),
                "product_summary": clean_text(data.get("product_summary"), 2000),
                "space_requirements": clean_text(data.get("space_requirements"), 1000),
            })
    submission = Submission.objects.create(
        kind=kind,
        name=name,
        email=email,
        organisation=clean_text(data.get("organisation"), 200),
        phone=clean_text(data.get("phone"), 40),
        message=message,
        details=details,
        photo=photo if kind in speaker_kinds else None,
        ip_address=ip,
    )
    try:
        notify(submission)
    except Exception:
        logger.exception("Could not send notification for submission %s", submission.pk)
    try:
        notify_applicant(submission)
    except Exception:
        logger.exception("Could not send applicant confirmation for submission %s", submission.pk)
    return JsonResponse({
        "ok": True,
        "status_url": settings.FRONTEND_URL.rstrip("/") + "/application-status.html?token=" + str(submission.tracking_token),
    })

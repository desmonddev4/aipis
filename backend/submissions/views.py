import hashlib
import hmac
import json
import logging
import uuid
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
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
from .payments import PaymentError, get_bog_usd_ghs_rate, initialize_transaction, verify_transaction

logger = logging.getLogger(__name__)

ALLOWED_DETAILS = {
    "partnership": ["package"],
    "technical": ["topic"],
    "poster": ["title"],
    "exhibitor": ["booths"],
    "forensic": ["project", "country"],
    "keynote": ["nominee"],
    "guest": ["nominee"],
}
MESSAGE_REQUIRED = {"contact", "forensic", "poster", "keynote", "guest", "technical", "partnership", "exhibitor"}
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
            cleaned_attendees.append({
                "name": attendee_name,
                "email": attendee_email,
                "phone": attendee_phone,
                "country": attendee_country,
                "category": category,
            })
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    today = timezone.localdate()
    early = today <= EARLY_REGISTRATION_DEADLINE
    subtotal_usd = sum(
        REGISTRATION_PRICES_USD[attendee["category"]][1 if early else 0]
        for attendee in cleaned_attendees
    )
    discount_usd = Decimal("0.00")
    if len(cleaned_attendees) >= 5:
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
        organisation=organisation,
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
    try:
        data = json.loads(request.body or b"{}")
        if not isinstance(data, dict):
            raise ValueError
    except ValueError:
        return JsonResponse({"ok": False, "errors": {"__all__": "Invalid request."}}, status=400)

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

    errors = {}
    name = clean_text(data.get("name"), 120)
    email = clean_text(data.get("email"), 254)
    message = clean_text(data.get("message"), 4000)
    if not name:
        errors["name"] = "Please enter your name."
    if not valid_email(email):
        errors["email"] = "Please enter a valid email address."
    if kind in MESSAGE_REQUIRED and not message:
        errors["message"] = "Please add a message."
    if kind in {"partnership", "exhibitor"}:
        if data.get("consent") is not True:
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
    if errors:
        return JsonResponse({"ok": False, "errors": errors}, status=400)

    details = {key: clean_text(data.get(key), 200) for key in ALLOWED_DETAILS.get(kind, [])}
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
        ip_address=ip,
    )
    try:
        notify(submission)
    except Exception:
        logger.exception("Could not send notification for submission %s", submission.pk)
    return JsonResponse({"ok": True})

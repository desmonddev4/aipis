import json
from datetime import date, datetime, timedelta
from decimal import Decimal
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone


class PaymentError(Exception):
    pass


class _RateTable(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None and self.row is not None:
            self.row.append(" ".join(" ".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def get_bog_usd_ghs_rate():
    request = Request(
        "https://www.bog.gov.gh/treasury-and-the-markets/daily-interbank-fx-rates/",
        headers={"User-Agent": "AIPIS registration payments/1.0"},
    )
    try:
        with urlopen(request, timeout=12) as response:
            html = response.read(2_000_000).decode("utf-8", "replace")
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        raise PaymentError("The Bank of Ghana exchange rate is temporarily unavailable.") from exc

    parser = _RateTable()
    parser.feed(html)
    candidates = []
    for cells in parser.rows:
        if len(cells) < 6 or not any("USDGHS" in cell.replace(" ", "").upper() for cell in cells):
            continue
        try:
            published = None
            for cell in cells:
                for fmt in ("%d %b %Y", "%d %B %Y", "%Y-%m-%d"):
                    try:
                        published = datetime.strptime(cell.strip(), fmt).date()
                        break
                    except ValueError:
                        pass
                if published:
                    break
            rate = Decimal(cells[-1].replace(",", "").strip())
            if published and rate > 0:
                candidates.append((published, rate))
        except Exception:
            continue

    if not candidates:
        raise PaymentError("The Bank of Ghana USD/GHS rate could not be read. Please try again later.")
    published, rate = max(candidates, key=lambda item: item[0])
    if published > timezone.localdate() or timezone.localdate() - published > timedelta(days=7):
        raise PaymentError("The latest Bank of Ghana USD/GHS rate is out of date. Please try again later.")
    return rate, published


def _paystack_request(path, method="GET", payload=None):
    secret = getattr(settings, "PAYSTACK_SECRET_KEY", "")
    if not secret:
        raise PaymentError("Online payments are not configured yet.")
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        "https://api.paystack.co" + path,
        data=data,
        method=method,
        headers={"Authorization": "Bearer " + secret, "Content-Type": "application/json"},
    )
    try:
        with urlopen(request, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        raise PaymentError("Paystack could not be reached. Please try again.") from exc
    if not result.get("status"):
        raise PaymentError(result.get("message") or "Paystack could not initialize payment.")
    return result.get("data") or {}


def initialize_transaction(payment, email, name):
    api_url = getattr(settings, "API_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    payload = {
        "email": email,
        "amount": str(payment.amount_kobo),
        "currency": payment.currency,
        "reference": payment.reference,
        "callback_url": api_url + "/api/payments/callback/",
        "metadata": {
            "registration_id": payment.submission_id,
            "usd_amount": str(payment.usd_amount),
            "fx_rate": str(payment.fx_rate),
            "fx_rate_date": payment.fx_rate_date.isoformat(),
            "custom_fields": [
                {"display_name": "Registrant", "variable_name": "registrant", "value": name},
                {"display_name": "Registration ID", "variable_name": "registration_id", "value": str(payment.submission_id)},
            ],
        },
    }
    result = _paystack_request("/transaction/initialize", "POST", payload)
    url = result.get("authorization_url", "")
    if not url.startswith("https://checkout.paystack.com/"):
        raise PaymentError("Paystack returned an invalid checkout URL.")
    return url


def verify_transaction(reference):
    return _paystack_request("/transaction/verify/" + quote(reference, safe=""), "GET")

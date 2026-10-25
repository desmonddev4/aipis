from django.conf import settings
from django.db import models


class Submission(models.Model):
    class Kind(models.TextChoices):
        CONTACT = "contact", "General contact"
        REGISTRATION = "registration", "Registration"
        PARTNERSHIP = "partnership", "Partnership enquiry"
        KEYNOTE = "keynote", "Distinguished Keynote nomination"
        GUEST = "guest", "Special Guest Speaker proposal"
        PANELIST = "panelist", "Panelist application"
        TECHNICAL = "technical", "Technical Keynote application"
        POSTER = "poster", "Poster abstract"
        EXHIBITOR = "exhibitor", "Exhibition booking"
        FORENSIC = "forensic", "Forensic Clinic nomination"
        ROUNDTABLE = "roundtable", "Roundtable invitation request"

    class Status(models.TextChoices):
        NEW = "new", "New"
        IN_PROGRESS = "in_progress", "In progress"
        HANDLED = "handled", "Handled"
        ARCHIVED = "archived", "Archived"

    kind = models.CharField(max_length=20, choices=Kind.choices, db_index=True)
    name = models.CharField(max_length=120)
    email = models.EmailField()
    organisation = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    message = models.TextField(blank=True)
    photo = models.FileField(upload_to="speaker-photos/%Y/%m/", blank=True)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} from {self.name}"


class RegistrationPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Paid"
        FAILED = "failed", "Failed"

    submission = models.OneToOneField(Submission, related_name="payment", on_delete=models.CASCADE)
    reference = models.CharField(max_length=100, unique=True)
    amount_kobo = models.PositiveBigIntegerField()
    currency = models.CharField(max_length=3, default="GHS")
    usd_amount = models.DecimalField(max_digits=10, decimal_places=2)
    fx_rate = models.DecimalField(max_digits=12, decimal_places=6)
    fx_rate_date = models.DateField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING, db_index=True)
    authorization_url = models.URLField(blank=True)
    paystack_transaction_id = models.PositiveBigIntegerField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def amount_ghs(self):
        from decimal import Decimal
        return (Decimal(self.amount_kobo) / Decimal("100")).quantize(Decimal("0.01"))


class SubmissionNote(models.Model):
    class Kind(models.TextChoices):
        NOTE = "note", "Internal note"
        REPLY = "reply", "Email reply"

    submission = models.ForeignKey(Submission, related_name="notes", on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.NOTE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

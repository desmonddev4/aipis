from django.conf import settings
from django.db import models


class Submission(models.Model):
    class Kind(models.TextChoices):
        CONTACT = "contact", "General contact"
        REGISTRATION = "registration", "Registration"
        PARTNERSHIP = "partnership", "Partnership enquiry"
        KEYNOTE = "keynote", "Distinguished Keynote nomination"
        GUEST = "guest", "Special Guest Speaker proposal"
        TECHNICAL = "technical", "Technical Keynote application"
        POSTER = "poster", "Poster abstract"
        EXHIBITOR = "exhibitor", "Exhibition booking"
        FORENSIC = "forensic", "Forensic Clinic nomination"

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
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NEW, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_kind_display()} from {self.name}"


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

from django.contrib import admin

from .models import Submission


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "name", "email", "organisation", "handled")
    list_filter = ("kind", "handled", "created_at")
    list_editable = ("handled",)
    search_fields = ("name", "email", "organisation", "message")
    readonly_fields = ("created_at", "ip_address")

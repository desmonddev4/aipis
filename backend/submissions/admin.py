from django.contrib import admin

from .models import Submission, SubmissionNote


class NoteInline(admin.TabularInline):
    model = SubmissionNote
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "name", "email", "organisation", "application_role", "has_photo", "status")
    list_filter = ("kind", "status", "created_at")
    list_editable = ("status",)
    search_fields = ("name", "email", "organisation", "message")
    readonly_fields = ("created_at", "ip_address")
    inlines = [NoteInline]

    @admin.display(description="Application role")
    def application_role(self, obj):
        return obj.details.get("role") or "-"

    @admin.display(boolean=True, description="Photo")
    def has_photo(self, obj):
        return bool(obj.photo)

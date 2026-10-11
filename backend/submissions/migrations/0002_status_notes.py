import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def handled_to_status(apps, schema_editor):
    Submission = apps.get_model("submissions", "Submission")
    Submission.objects.filter(handled=True).update(status="handled")


def status_to_handled(apps, schema_editor):
    Submission = apps.get_model("submissions", "Submission")
    Submission.objects.filter(status="handled").update(handled=True)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("submissions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="status",
            field=models.CharField(
                choices=[("new", "New"), ("in_progress", "In progress"), ("handled", "Handled"), ("archived", "Archived")],
                db_index=True,
                default="new",
                max_length=20,
            ),
        ),
        migrations.RunPython(handled_to_status, status_to_handled),
        migrations.RemoveField(model_name="submission", name="handled"),
        migrations.CreateModel(
            name="SubmissionNote",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("note", "Internal note"), ("reply", "Email reply")], default="note", max_length=10)),
                ("text", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("submission", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notes", to="submissions.submission")),
            ],
            options={"ordering": ["created_at"]},
        ),
    ]

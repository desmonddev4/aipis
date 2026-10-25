import uuid

from django.db import migrations, models


def populate_tracking_tokens(apps, schema_editor):
    Submission = apps.get_model("submissions", "Submission")
    for submission in Submission.objects.filter(tracking_token__isnull=True).iterator():
        submission.tracking_token = uuid.uuid4()
        submission.save(update_fields=["tracking_token"])


class Migration(migrations.Migration):
    dependencies = [("submissions", "0007_alter_submission_status")]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="tracking_token",
            field=models.UUIDField(blank=True, db_index=True, editable=False, null=True),
        ),
        migrations.RunPython(populate_tracking_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="submission",
            name="tracking_token",
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True),
        ),
    ]

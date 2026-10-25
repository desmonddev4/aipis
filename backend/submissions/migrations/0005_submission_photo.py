from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("submissions", "0004_roundtable_invitation_kind")]

    operations = [
        migrations.AddField(
            model_name="submission",
            name="photo",
            field=models.FileField(blank=True, upload_to="speaker-photos/%Y/%m/"),
        ),
    ]

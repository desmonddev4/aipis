from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("submissions", "0005_submission_photo")]

    operations = [
        migrations.AlterField(
            model_name="submission",
            name="kind",
            field=models.CharField(
                choices=[
                    ("contact", "General contact"),
                    ("registration", "Registration"),
                    ("partnership", "Partnership enquiry"),
                    ("keynote", "Distinguished Keynote nomination"),
                    ("guest", "Special Guest Speaker proposal"),
                    ("panelist", "Panelist application"),
                    ("technical", "Technical Keynote application"),
                    ("poster", "Poster abstract"),
                    ("exhibitor", "Exhibition booking"),
                    ("forensic", "Forensic Clinic nomination"),
                    ("roundtable", "Roundtable invitation request"),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
    ]

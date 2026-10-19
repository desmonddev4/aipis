from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("submissions", "0002_status_notes"),
    ]

    operations = [
        migrations.CreateModel(
            name="RegistrationPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reference", models.CharField(max_length=100, unique=True)),
                ("amount_kobo", models.PositiveBigIntegerField()),
                ("currency", models.CharField(default="GHS", max_length=3)),
                ("usd_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("fx_rate", models.DecimalField(decimal_places=6, max_digits=12)),
                ("fx_rate_date", models.DateField()),
                ("status", models.CharField(choices=[("pending", "Pending"), ("success", "Paid"), ("failed", "Failed")], db_index=True, default="pending", max_length=12)),
                ("authorization_url", models.URLField(blank=True)),
                ("paystack_transaction_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("submission", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="payment", to="submissions.submission")),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import TestCase, override_settings

from submissions.models import Submission

User = get_user_model()
H = {"HTTP_HOST": "localhost"}


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend", ALLOWED_HOSTS=["localhost"])
class DashboardApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_user("boss", password="Str0ng-pass-123", is_staff=True, is_superuser=True)
        cls.staff = User.objects.create_user("staff", password="Str0ng-pass-123", is_staff=True)
        cls.outsider = User.objects.create_user("visitor", password="Str0ng-pass-123")
        cls.reg = Submission.objects.create(
            kind="registration", name="Ama", email="ama@example.com", details={"category": "Ghanaian delegate", "delegates": "3", "country": "ghana"}
        )
        Submission.objects.create(kind="partnership", name="Kojo", email="k@example.com", details={"package": "Strategic Partner"})

    def login(self, username="boss", password="Str0ng-pass-123"):
        return self.client.post("/api/admin/login/", {"username": username, "password": password}, content_type="application/json", **H)

    def auth(self, username="boss"):
        token = self.login(username).json()["token"]
        return {"HTTP_AUTHORIZATION": f"Bearer {token}", **H}

    def test_login(self):
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.login(password="wrong").status_code, 400)
        self.assertEqual(self.login("visitor").status_code, 400)

    def test_requires_token(self):
        self.assertEqual(self.client.get("/api/admin/overview/", **H).status_code, 401)
        self.assertEqual(self.client.get("/api/admin/overview/", HTTP_AUTHORIZATION="Bearer junk", **H).status_code, 401)

    def test_list_filters_and_counts(self):
        h = self.auth()
        data = self.client.get("/api/admin/submissions/?kind=registration", **h).json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["counts"]["new"], 1)
        data = self.client.get("/api/admin/submissions/?q=kojo", **h).json()
        self.assertEqual(data["count"], 1)

    def test_status_note_reply_and_delete(self):
        h = self.auth()
        url = f"/api/admin/submissions/{self.reg.pk}/"
        res = self.client.patch(url, {"status": "handled"}, content_type="application/json", **h)
        self.assertEqual(res.json()["submission"]["status"], "handled")
        self.assertEqual(self.client.post(url + "notes/", {"text": "Called them"}, content_type="application/json", **h).status_code, 201)
        res = self.client.post(url + "reply/", {"subject": "Hello", "body": "Thanks"}, content_type="application/json", **h)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(mail.outbox[-1].to, ["ama@example.com"])
        self.assertEqual(self.client.delete(url, **h).status_code, 200)
        self.assertFalse(Submission.objects.filter(pk=self.reg.pk).exists())

    def test_bulk_and_export(self):
        h = self.auth()
        ids = list(Submission.objects.values_list("pk", flat=True))
        res = self.client.post("/api/admin/submissions/bulk/", {"ids": ids, "action": "status", "status": "archived"}, content_type="application/json", **h)
        self.assertEqual(res.json()["count"], 2)
        csv = self.client.get("/api/admin/submissions/export/", **h)
        self.assertIn("text/csv", csv["Content-Type"])
        self.assertIn("Ama", csv.content.decode())

    def test_stats_endpoints(self):
        h = self.auth()
        overview = self.client.get("/api/admin/overview/", **h).json()
        self.assertEqual(overview["total"], 2)
        self.assertEqual(len(overview["daily"]), 30)
        analytics = self.client.get("/api/admin/analytics/?days=30", **h).json()
        self.assertEqual(analytics["registrations"]["delegates"], 3)
        self.assertEqual(analytics["registrations"]["countries"][0]["label"], "Ghana")
        self.assertEqual(self.client.get("/api/admin/badges/", **h).json()["new_total"], 2)

    def test_team_management_is_superuser_only(self):
        self.assertEqual(self.client.get("/api/admin/users/", **self.auth("staff")).status_code, 403)
        h = self.auth()
        res = self.client.post("/api/admin/users/", {"username": "newbie", "password": "Another-Str0ng-1"}, content_type="application/json", **h)
        self.assertEqual(res.status_code, 201)
        weak = self.client.post("/api/admin/users/", {"username": "x", "password": "123"}, content_type="application/json", **h)
        self.assertEqual(weak.status_code, 400)
        self.assertEqual(self.client.delete(f"/api/admin/users/{self.admin.pk}/", **h).status_code, 400)

    def test_password_change_revokes_old_token(self):
        h = self.auth("staff")
        res = self.client.post("/api/admin/password/", {"current": "Str0ng-pass-123", "new": "Brand-new-Pass-9"}, content_type="application/json", **h)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.client.get("/api/admin/me/", **h).status_code, 401)

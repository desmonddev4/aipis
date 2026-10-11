from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/admin/", include("dashboard.urls")),
    path("api/", include("submissions.urls")),
]

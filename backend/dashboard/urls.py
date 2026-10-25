from django.urls import path

from . import accounts, stats, submissions_api

urlpatterns = [
    path("login/", accounts.login),
    path("me/", accounts.me),
    path("password/", accounts.change_password),
    path("users/", accounts.users),
    path("users/<int:pk>/", accounts.user_detail),
    path("badges/", stats.badges),
    path("overview/", stats.overview),
    path("analytics/", stats.analytics),
    path("submissions/", submissions_api.submission_list),
    path("submissions/export/", submissions_api.export_csv),
    path("submissions/bulk/", submissions_api.bulk),
    path("submissions/<int:pk>/photo/", submissions_api.submission_photo),
    path("submissions/<int:pk>/decision/", submissions_api.decision),
    path("submissions/<int:pk>/", submissions_api.submission_detail),
    path("submissions/<int:pk>/notes/", submissions_api.add_note),
    path("submissions/<int:pk>/reply/", submissions_api.reply),
]

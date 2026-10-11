"""Token authentication for the staff dashboard (works across Vercel and Render without cookies)."""
import json
from functools import wraps

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.core.cache import cache
from django.http import JsonResponse

SALT = "aipis-dashboard-token"


def error(message, status=400, **extra):
    return JsonResponse({"ok": False, "error": message, **extra}, status=status)


def json_body(request):
    try:
        data = json.loads(request.body or b"{}")
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


def issue_token(user):
    # The password hash fragment invalidates old tokens when the password changes
    return signing.dumps({"uid": user.pk, "pw": user.password[-12:]}, salt=SALT)


def user_from_request(request):
    header = request.META.get("HTTP_AUTHORIZATION", "")
    if not header.startswith("Bearer "):
        return None
    try:
        data = signing.loads(header[7:], salt=SALT, max_age=settings.DASHBOARD_TOKEN_MAX_AGE)
    except signing.BadSignature:
        return None
    user = get_user_model().objects.filter(pk=data.get("uid"), is_active=True, is_staff=True).first()
    if user is None or user.password[-12:] != data.get("pw"):
        return None
    return user


def staff_required(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = user_from_request(request)
        if user is None:
            return error("Please sign in again.", 401)
        request.staff_user = user
        return view(request, *args, **kwargs)

    return wrapper


def superuser_required(view):
    @wraps(view)
    @staff_required
    def wrapper(request, *args, **kwargs):
        if not request.staff_user.is_superuser:
            return error("Only administrators can do this.", 403)
        return view(request, *args, **kwargs)

    return wrapper


def throttled(key, limit, window):
    cache.add(key, 0, window)
    try:
        return cache.incr(key) > limit
    except ValueError:
        return False

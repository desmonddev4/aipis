from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST

from .auth import error, issue_token, json_body, staff_required, superuser_required, throttled
from .serializers import user_dict

User = get_user_model()


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    return forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "")


@csrf_exempt
@require_POST
def login(request):
    data = json_body(request)
    if data is None:
        return error("Invalid request.")
    if throttled(f"dash-login:{client_ip(request)}", 10, 600):
        return error("Too many sign-in attempts. Please wait a few minutes.", 429)

    user = authenticate(request, username=str(data.get("username", "")).strip(), password=str(data.get("password", "")))
    if user is None or not user.is_staff:
        return error("Incorrect username or password.", 400)
    return JsonResponse({"ok": True, "token": issue_token(user), "user": user_dict(user)})


@csrf_exempt
@staff_required
@require_http_methods(["GET", "PATCH"])
def me(request):
    user = request.staff_user
    if request.method == "PATCH":
        data = json_body(request) or {}
        for field in ("first_name", "last_name", "email"):
            if field in data:
                setattr(user, field, str(data[field]).strip()[:150])
        user.save()
    return JsonResponse({"ok": True, "user": user_dict(user)})


@csrf_exempt
@staff_required
@require_POST
def change_password(request):
    data = json_body(request) or {}
    user = request.staff_user
    if not user.check_password(str(data.get("current", ""))):
        return error("Your current password is not correct.", 400, field="current")
    try:
        validate_password(str(data.get("new", "")), user)
    except ValidationError as exc:
        return error(" ".join(exc.messages), 400, field="new")
    user.set_password(data["new"])
    user.save()
    return JsonResponse({"ok": True, "token": issue_token(user)})


@csrf_exempt
@superuser_required
@require_http_methods(["GET", "POST"])
def users(request):
    if request.method == "GET":
        qs = User.objects.filter(is_staff=True).order_by("-is_superuser", "username")
        return JsonResponse({"ok": True, "results": [user_dict(u) for u in qs]})

    data = json_body(request) or {}
    username = str(data.get("username", "")).strip()
    password = str(data.get("password", ""))
    if not username:
        return error("Please enter a username.", 400, field="username")
    if User.objects.filter(username__iexact=username).exists():
        return error("That username is already taken.", 400, field="username")
    user = User(
        username=username,
        first_name=str(data.get("first_name", "")).strip()[:150],
        last_name=str(data.get("last_name", "")).strip()[:150],
        email=str(data.get("email", "")).strip()[:254],
        is_staff=True,
        is_superuser=bool(data.get("is_superuser")),
    )
    try:
        validate_password(password, user)
    except ValidationError as exc:
        return error(" ".join(exc.messages), 400, field="password")
    user.set_password(password)
    user.save()
    return JsonResponse({"ok": True, "user": user_dict(user)}, status=201)


@csrf_exempt
@superuser_required
@require_http_methods(["PATCH", "DELETE"])
def user_detail(request, pk):
    user = User.objects.filter(pk=pk, is_staff=True).first()
    if user is None:
        return error("User not found.", 404)
    me = request.staff_user

    if request.method == "DELETE":
        if user.pk == me.pk:
            return error("You cannot delete your own account.", 400)
        user.delete()
        return JsonResponse({"ok": True})

    data = json_body(request) or {}
    if "is_active" in data:
        if user.pk == me.pk and not data["is_active"]:
            return error("You cannot deactivate your own account.", 400)
        user.is_active = bool(data["is_active"])
    if "is_superuser" in data:
        if user.pk == me.pk and not data["is_superuser"]:
            return error("You cannot remove your own administrator access.", 400)
        user.is_superuser = bool(data["is_superuser"])
    if data.get("password"):
        try:
            validate_password(str(data["password"]), user)
        except ValidationError as exc:
            return error(" ".join(exc.messages), 400, field="password")
        user.set_password(data["password"])
    user.save()
    return JsonResponse({"ok": True, "user": user_dict(user)})

import os
from datetime import timedelta
from secrets import randbelow

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.views import LogoutView
from django.shortcuts import redirect, render
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views import View
from django.views.generic import TemplateView
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import GenericAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

import authorization.models
import authorization.serializers

User = get_user_model()


class HomeRedirectView(View):
    def get(self, request):
        if request.user.is_authenticated:
            return redirect("/notes/")
        return redirect("/login/")


class LoginPageView(View):
    template_name = "auth/login.html"

    def get(self, request):
        if request.user.is_authenticated:
            return redirect("/notes/")

        ctx = {}
        if request.GET.get("confirmed") == "1":
            ctx["info"] = "Email confirmed. Now you can log in."
        return render(request, self.template_name, ctx)

    def post(self, request):
        username = (request.POST.get("username") or "").strip()
        password = request.POST.get("password") or ""

        if not username or not password:
            return render(request, self.template_name, {"error": "Please fill username and password."})

        user = authenticate(request, username=username, password=password)
        if not user:
            return render(request, self.template_name, {"error": "Invalid username or password."})
        if not user.is_active:
            return render(request, self.template_name, {"error": "Account is not active. Confirm your email first."})

        login(request, user)
        return redirect(request.GET.get("next") or "/notes/")


class LogoutPageView(LogoutView):
    next_page = settings.LOGOUT_REDIRECT_URL


class SignupPageView(View):
    template_name = "auth/signup.html"

    def get(self, request):
        if request.user.is_authenticated:
            return redirect("/notes/")
        return render(request, self.template_name)

    def post(self, request):
        payload = {
            "username": (request.POST.get("username") or "").strip(),
            "email": (request.POST.get("email") or "").strip(),
            "password": request.POST.get("password") or "",
            "password_confirm": request.POST.get("password_confirm") or "",
        }

        serializer = authorization.serializers.RegisterSerializer(data=payload)
        if not serializer.is_valid():
            return render(request, self.template_name, {"error": _format_serializer_errors(serializer.errors)})

        user = serializer.save()

        code = _generate_6_digit_code()
        now = timezone.now()
        authorization.models.EmailVerificationCode.objects.create(
            user=user,
            email=user.email,
            code=code,
            expires_at=now + timedelta(minutes=5),
        )

        _write_email_stub(
            to_email=user.email,
            subject="Confirm your email",
            body=f"Your confirmation code: {code}\n",
        )

        request.session["pending_email"] = user.email
        return redirect(f"/confirm-email/?email={user.email}")


class ConfirmEmailPageView(View):
    template_name = "auth/confirm_email.html"

    def get(self, request):
        email = (request.GET.get("email") or request.session.get("pending_email") or "").strip().lower()
        if not email:
            return redirect("/signup/")
        return render(request, self.template_name, {"email": email})

    def post(self, request):
        email = (request.POST.get("email") or request.session.get("pending_email") or "").strip().lower()
        code = (request.POST.get("code") or "").strip()

        serializer = authorization.serializers.EmailConfirmSerializer(data={"email": email, "code": code})
        if not serializer.is_valid():
            return render(
                request,
                self.template_name,
                {"email": email, "error": _format_serializer_errors(serializer.errors)},
            )

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return render(request, self.template_name, {"email": email, "error": "User with this email not found."})

        now = timezone.now()
        rec = (
            authorization.models.EmailVerificationCode.objects.filter(
                user=user,
                email=email,
                code=code,
                is_used=False,
                expires_at__gt=now,
            )
            .order_by("-created_at")
            .first()
        )

        if not rec:
            return render(request, self.template_name, {"email": email, "error": "Invalid or expired code."})

        rec.is_used = True
        rec.save(update_fields=["is_used"])

        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        request.session.pop("pending_email", None)
        return redirect("/login/?confirmed=1")


class ResetPasswordRequestPageView(TemplateView):
    template_name = "auth/reset_password_request.html"


class ResetPasswordCodePageView(TemplateView):
    template_name = "auth/reset_password_code.html"


@method_decorator(ensure_csrf_cookie, name="dispatch")
class ProfilePageView(LoginRequiredMixin, TemplateView):
    template_name = "auth/profile.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        u = self.request.user
        notes_qs = getattr(u, "notes", None)
        if u and u.is_authenticated and notes_qs is not None:
            ctx["note_count"] = notes_qs.count()
            ctx["pinned_count"] = notes_qs.filter(is_pinned=True).count()
        else:
            ctx["note_count"] = 0
            ctx["pinned_count"] = 0

        ctx["date_joined"] = getattr(u, "date_joined", None)
        ctx["last_login"] = getattr(u, "last_login", None)
        return ctx


def _generate_6_digit_code() -> str:
    return f"{randbelow(1_000_000):06d}"


def _write_email_stub(to_email: str, subject: str, body: str) -> None:
    out_dir = getattr(settings, "SEND_EMAIL_DIR", settings.BASE_DIR / "send_email")
    out_dir = os.fspath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    ts = timezone.now().strftime("%Y%m%d_%H%M%S")
    safe_email = to_email.replace("@", "_at_").replace(".", "_")
    filename = os.path.join(out_dir, f"{ts}__{safe_email}.txt")

    content = f"TO: {to_email}\nSUBJECT: {subject}\n\n{body}\n"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)


def _format_serializer_errors(errors) -> str:
    msgs = []
    if isinstance(errors, dict):
        for k, v in errors.items():
            if isinstance(v, (list, tuple)):
                msgs.extend([f"{k}: {str(x)}" for x in v])
            else:
                msgs.append(f"{k}: {str(v)}")
    elif isinstance(errors, (list, tuple)):
        msgs.extend([str(x) for x in errors])
    else:
        msgs.append(str(errors))
    return "\n".join(msgs).strip()


@extend_schema(tags=["auth"])
class RegisterView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = authorization.serializers.RegisterSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        code = _generate_6_digit_code()
        now = timezone.now()

        authorization.models.EmailVerificationCode.objects.create(
            user=user,
            email=user.email,
            code=code,
            expires_at=now + timedelta(minutes=5),
        )

        _write_email_stub(
            to_email=user.email,
            subject="Confirm your email",
            body=f"Your confirmation code: {code}\n",
        )

        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "detail": "User created. Confirmation code sent to email (stub).",
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["auth"])
class ConfirmEmailView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = authorization.serializers.EmailConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"].strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User with this email not found."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        rec = (
            authorization.models.EmailVerificationCode.objects.filter(
                user=user,
                email=email,
                code=code,
                is_used=False,
                expires_at__gt=now,
            )
            .order_by("-created_at")
            .first()
        )

        if not rec:
            return Response({"detail": "Invalid or expired code."}, status=status.HTTP_400_BAD_REQUEST)

        rec.is_used = True
        rec.save(update_fields=["is_used"])

        if not user.is_active:
            user.is_active = True
            user.save(update_fields=["is_active"])

        return Response({"detail": "Email confirmed."}, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class ResendEmailCodeView(GenericAPIView):
    permission_classes = [AllowAny]
    serializer_class = authorization.serializers.EmailConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User with this email not found."}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_active:
            return Response({"detail": "Email already confirmed."}, status=status.HTTP_400_BAD_REQUEST)

        code = _generate_6_digit_code()
        now = timezone.now()

        authorization.models.EmailVerificationCode.objects.create(
            user=user,
            email=email,
            code=code,
            expires_at=now + timedelta(minutes=5),
        )

        _write_email_stub(
            to_email=email,
            subject="Confirm your email",
            body=f"Your confirmation code: {code}\n",
        )

        return Response({"detail": "Code resent."}, status=status.HTTP_200_OK)


@extend_schema(tags=["auth"])
class ProfileView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return authorization.serializers.UserMeUpdateSerializer
        return authorization.serializers.UserMeSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = request.user
        logout(request._request)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["auth"])
class LogoutAPIView(GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request._request)
        return Response(status=status.HTTP_204_NO_CONTENT)

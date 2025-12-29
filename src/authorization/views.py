import os
from datetime import timedelta
from secrets import randbelow

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import render
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import GenericAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

import authorization.models
import authorization.serializers

User = get_user_model()


def login_view(request):
    return render(request, "auth/login.html")


def signup_view(request):
    return render(request, "auth/signup.html")


def confirm_email_view(request):
    return render(request, "auth/confirm_email.html")


def reset_password_request_view(request):
    return render(request, "auth/reset_password_request.html")


def reset_password_code_view(request):
    return render(request, "auth/reset_password_code.html")


def notes_view(request):
    return render(request, "notes/index.html")


def profile_view(request):
    return render(request, "profile/index.html")


def _generate_6_digit_code() -> str:
    return f"{randbelow(1_000_000):06d}"


def _write_email_stub(to_email: str, subject: str, body: str) -> None:
    out_dir = getattr(settings, "SEND_EMAIL_DIR", settings.BASE_DIR / "send_email")
    os.makedirs(out_dir, exist_ok=True)

    ts = timezone.now().strftime("%Y%m%d_%H%M%S")
    safe_email = to_email.replace("@", "_at_").replace(".", "_")
    filename = out_dir / f"{ts}__{safe_email}.txt"

    content = f"TO: {to_email}\nSUBJECT: {subject}\n\n{body}\n"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)


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
            email=user.email,
            code=code,
            expires_at=now + timedelta(minutes=5),
        )

        _write_email_stub(
            to_email=user.email,
            subject="Confirm your email",
            body=f"Your confirmation code: {code}\n",
        )

        return Response({"detail": "Code resent."}, status=status.HTTP_200_OK)


class ProfileView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return authorization.serializers.UserMeUpdateSerializer
        return authorization.serializers.UserMeSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

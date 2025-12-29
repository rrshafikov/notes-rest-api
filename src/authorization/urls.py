from django.urls import path
import rest_framework_simplejwt.views

import authorization.views

app_name = "authorization"

urlpatterns = [
    path("login/", authorization.views.login_view, name="login"),
    path("signup/", authorization.views.signup_view, name="signup"),
    path("confirm-email/", authorization.views.confirm_email_view, name="confirm_email"),
    path("reset-password/", authorization.views.reset_password_request_view, name="reset_password"),
    path("reset-password/code/", authorization.views.reset_password_code_view, name="reset_password_code"),

    path("notes/", authorization.views.notes_view, name="notes"),

    path("api/auth/register/", authorization.views.RegisterView.as_view(), name="register"),
    path("api/auth/email/confirm/", authorization.views.ConfirmEmailView.as_view(), name="email-confirm"),
    path("api/auth/email/resend/", authorization.views.ResendEmailCodeView.as_view(), name="email-resend"),
    path("api/auth/profile/", authorization.views.ProfileView.as_view(), name="profile"),

    path("api/auth/jwt/create/", rest_framework_simplejwt.views.TokenObtainPairView.as_view(), name="jwt-create"),
    path("api/auth/jwt/refresh/", rest_framework_simplejwt.views.TokenRefreshView.as_view(), name="jwt-refresh"),
    path("api/auth/jwt/verify/", rest_framework_simplejwt.views.TokenVerifyView.as_view(), name="jwt-verify"),
]

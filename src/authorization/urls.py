from django.urls import path

import authorization.views

app_name = "authorization"

urlpatterns = [
    path("", authorization.views.HomeRedirectView.as_view(), name="home"),
    path("login/", authorization.views.LoginPageView.as_view(), name="login"),
    path("logout/", authorization.views.LogoutPageView.as_view(), name="logout"),
    path("signup/", authorization.views.SignupPageView.as_view(), name="signup"),
    path(
        "confirm-email/",
        authorization.views.ConfirmEmailPageView.as_view(),
        name="confirm_email",
    ),
    path(
        "reset-password/",
        authorization.views.ResetPasswordRequestPageView.as_view(),
        name="reset_password",
    ),
    path(
        "reset-password/code/",
        authorization.views.ResetPasswordCodePageView.as_view(),
        name="reset_password_code",
    ),
    path("profile/", authorization.views.ProfilePageView.as_view(), name="profile"),
]


__all__ = ()

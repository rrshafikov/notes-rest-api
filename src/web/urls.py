from django.urls import path
import web.views

app_name = "web"

urlpatterns = [
    path("login/", web.views.login_view, name="login"),
    path("signup/", web.views.signup_view, name="signup"),

    path("confirm-email/", web.views.confirm_email_view, name="confirm_email"),
    path("reset-password/", web.views.reset_password_request_view, name="reset_password"),
    path("reset-password/code/", web.views.reset_password_code_view, name="reset_password_code"),
]

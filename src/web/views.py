from django.shortcuts import render


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

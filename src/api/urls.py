from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter

import api.views
import authorization.views
import notes.views

app_name = "api"

router = DefaultRouter()
router.register(r"notes", notes.views.NoteViewSet, basename="note")

urlpatterns = [
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="api:schema"), name="docs"),
    path("auth/register/", authorization.views.RegisterView.as_view(), name="register"),
    path(
        "auth/email/confirm/",
        authorization.views.ConfirmEmailView.as_view(),
        name="email-confirm",
    ),
    path(
        "auth/email/resend/",
        authorization.views.ResendEmailCodeView.as_view(),
        name="email-resend",
    ),
    path("auth/profile/", authorization.views.ProfileView.as_view(), name="profile"),
    path("auth/logout/", authorization.views.LogoutAPIView.as_view(), name="logout"),
    path("auth/jwt/create/", api.views.JWTCreateView.as_view(), name="jwt-create"),
    path("auth/jwt/refresh/", api.views.JWTRefreshView.as_view(), name="jwt-refresh"),
    path("auth/jwt/verify/", api.views.JWTVerifyView.as_view(), name="jwt-verify"),
    path("", include(router.urls)),
]


__all__ = ()

from django.urls import include, path
from rest_framework.routers import DefaultRouter
import rest_framework_simplejwt.views


import notes.auth_views
import notes.health
import notes.views

router = DefaultRouter()
router.register(r"notes", notes.views.NoteViewSet, basename="note")

urlpatterns = [
    # meta
    path("health/", notes.health.health),

    # auth
    path(
        "auth/register/",
        notes.auth_views.RegisterView.as_view(),
        name="register",
    ),
    path(
        "auth/jwt/create/",
        rest_framework_simplejwt.views.TokenObtainPairView.as_view(),
        name="jwt-create",
    ),
    path(
        "auth/jwt/refresh/",
        rest_framework_simplejwt.views.TokenRefreshView.as_view(),
        name="jwt-refresh",
    ),
    path(
        "auth/jwt/verify/",
        rest_framework_simplejwt.views.TokenVerifyView.as_view(),
        name="jwt-verify",
    ),

    # api
    path("", include(router.urls)),
]

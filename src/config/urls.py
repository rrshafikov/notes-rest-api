from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path(
        "", include(("authorization.urls", "authorization"), namespace="authorization")
    ),
    path("admin/", admin.site.urls),
    path("notes/", include(("notes.urls", "notes"), namespace="notes")),
    path("api/", include(("api.urls", "api"), namespace="api")),
]

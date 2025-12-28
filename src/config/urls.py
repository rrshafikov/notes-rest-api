from django.contrib import admin
from django.urls import include, path
import drf_spectacular.views

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/schema/",
        drf_spectacular.views.SpectacularAPIView.as_view(),
        name="schema",
    ),
    path(
        "api/docs/",
        drf_spectacular.views.SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),

    path("api/", include("notes.urls")),
    path("", include("web.urls")),
]

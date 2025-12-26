from django.urls import include, path
from rest_framework.routers import DefaultRouter

import notes.health
import notes.views

router = DefaultRouter()
router.register(r"notes", notes.views.NoteViewSet, basename="note")

urlpatterns = [
    path("health/", notes.health.health),
    path("", include(router.urls)),
]

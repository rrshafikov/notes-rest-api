from django.contrib.auth.mixins import LoginRequiredMixin
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import TemplateView
from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

import notes.models
import notes.permissions
import notes.serializers


@method_decorator(ensure_csrf_cookie, name="dispatch")
class NotesPageView(LoginRequiredMixin, TemplateView):
    template_name = "notes/index.html"


@extend_schema(tags=["notes"])
class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = notes.serializers.NoteSerializer
    permission_classes = [IsAuthenticated, notes.permissions.IsOwner]
    queryset = notes.models.Note.objects.all()

    ordering_fields = ["created_at", "updated_at", "title", "is_pinned"]
    ordering = ["-updated_at"]
    search_fields = ["title", "content"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return notes.models.Note.objects.none()

        user = self.request.user
        if not user or not user.is_authenticated:
            return notes.models.Note.objects.none()

        return notes.models.Note.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


__all__ = ()

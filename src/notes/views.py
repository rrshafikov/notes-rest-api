from rest_framework import viewsets
import rest_framework.permissions

import notes.models
import notes.permissions
import notes.serializers


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = notes.serializers.NoteSerializer
    permission_classes = [
        rest_framework.permissions.IsAuthenticated,
        notes.permissions.IsOwner,
    ]

    ordering_fields = ["created_at", "title", "is_pinned"]
    ordering = ["-created_at"]
    search_fields = ["title", "content"]

    def get_queryset(self):
        return notes.models.Note.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

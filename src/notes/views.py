from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

import notes.models
import notes.serializers


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = notes.serializers.NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return notes.models.Note.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

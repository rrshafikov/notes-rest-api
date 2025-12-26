from django.contrib.auth import get_user_model
from rest_framework import serializers

import notes.models

User = get_user_model()


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = notes.models.Note
        fields = ("id", "title", "content", "is_pinned", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")


class UserMeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")
        read_only_fields = ("id", "username", "email")

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


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password")
        read_only_fields = ("id",)

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )

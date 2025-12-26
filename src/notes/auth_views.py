from rest_framework import generics
from rest_framework.permissions import AllowAny

import notes.serializers


class RegisterView(generics.CreateAPIView):
    serializer_class = notes.serializers.RegisterSerializer
    permission_classes = [AllowAny]

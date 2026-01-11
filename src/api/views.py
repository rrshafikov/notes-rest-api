from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView


@extend_schema(tags=["auth"])
class JWTCreateView(TokenObtainPairView):
    pass


@extend_schema(tags=["auth"])
class JWTRefreshView(TokenRefreshView):
    pass


@extend_schema(tags=["auth"])
class JWTVerifyView(TokenVerifyView):
    pass

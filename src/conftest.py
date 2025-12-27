import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture()
def api_client():
    # New client for every test
    return APIClient()


@pytest.fixture()
def user_password():
    return "StrongPass123"


@pytest.fixture()
def user(db, user_password):
    return User.objects.create_user(
        username="user1",
        email="user1@example.com",
        password=user_password,
    )


@pytest.fixture()
def user2(db, user_password):
    return User.objects.create_user(
        username="user2",
        email="user2@example.com",
        password=user_password,
    )


def _jwt_client_for(username: str, password: str) -> APIClient:
    client = APIClient()
    resp = client.post(
        "/api/auth/jwt/create/",
        {"username": username, "password": password},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    token = resp.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture()
def auth_client(user, user_password):
    return _jwt_client_for(user.username, user_password)


@pytest.fixture()
def auth_client_user2(user2, user_password):
    return _jwt_client_for(user2.username, user_password)

import pytest
import notes.models


@pytest.mark.django_db
def test_register_user(api_client):
    resp = api_client.post(
        "/api/auth/register/",
        {
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPass123",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    assert resp.data["username"] == "newuser"


@pytest.mark.django_db
def test_jwt_create(api_client, user, user_password):
    resp = api_client.post(
        "/api/auth/jwt/create/",
        {"username": user.username, "password": user_password},
        format="json",
    )
    assert resp.status_code == 200, resp.data
    assert "access" in resp.data
    assert "refresh" in resp.data


@pytest.mark.django_db
def test_notes_crud(auth_client):
    # Create
    create_resp = auth_client.post(
        "/api/notes/",
        {"title": "Note 1", "content": "Text 1", "is_pinned": False},
        format="json",
    )
    assert create_resp.status_code == 201, create_resp.data
    note_id = create_resp.data["id"]

    # List
    list_resp = auth_client.get("/api/notes/")
    assert list_resp.status_code == 200, list_resp.data
    assert list_resp.data["count"] >= 1

    # Retrieve
    get_resp = auth_client.get(f"/api/notes/{note_id}/")
    assert get_resp.status_code == 200, get_resp.data
    assert get_resp.data["title"] == "Note 1"

    # Patch
    patch_resp = auth_client.patch(
        f"/api/notes/{note_id}/",
        {"title": "Updated"},
        format="json",
    )
    assert patch_resp.status_code == 200, patch_resp.data
    assert patch_resp.data["title"] == "Updated"

    # Delete
    del_resp = auth_client.delete(f"/api/notes/{note_id}/")
    assert del_resp.status_code == 204

    # Ensure deleted
    get_after = auth_client.get(f"/api/notes/{note_id}/")
    assert get_after.status_code in (404, 410)


@pytest.mark.django_db
def test_owner_isolation(auth_client, auth_client_user2, user):
    # user1 creates a note
    resp = auth_client.post(
        "/api/notes/",
        {"title": "Private", "content": "secret"},
        format="json",
    )
    assert resp.status_code == 201, resp.data
    note_id = resp.data["id"]

    # user2 tries to access it
    get_resp = auth_client_user2.get(f"/api/notes/{note_id}/")
    assert get_resp.status_code == 404

    # user2 list should not contain that note
    list_resp = auth_client_user2.get("/api/notes/")
    assert list_resp.status_code == 200, list_resp.data
    results = list_resp.data.get("results", [])
    assert all(n["id"] != note_id for n in results)

    # model-level sanity: note exists for owner
    assert notes.models.Note.objects.filter(id=note_id, owner=user).exists()

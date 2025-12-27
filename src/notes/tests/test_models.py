import pytest
from django.contrib.auth import get_user_model

import notes.models

User = get_user_model()


@pytest.mark.django_db
def test_create_note():
    user = User.objects.create_user(
        username="testuser",
        password="password123"
    )

    note = notes.models.Note.objects.create(
        owner=user,
        title="Test note",
        content="Some text"
    )

    assert note.id is not None
    assert note.owner == user
    assert note.title == "Test note"
    assert note.content == "Some text"
    assert note.is_pinned is False


@pytest.mark.django_db
def test_note_default_ordering():
    user = User.objects.create_user(
        username="testuser2",
        password="password123"
    )

    note1 = notes.models.Note.objects.create(
        owner=user,
        title="Old note"
    )
    note2 = notes.models.Note.objects.create(
        owner=user,
        title="New note"
    )

    notes_list = list(notes.models.Note.objects.filter(owner=user))

    assert notes_list[0] == note2
    assert notes_list[1] == note1


@pytest.mark.django_db
def test_note_str_representation():
    user = User.objects.create_user(
        username="testuser3",
        password="password123"
    )

    note = notes.models.Note.objects.create(
        owner=user,
        title="Readable title"
    )

    assert "Readable title" in str(note)

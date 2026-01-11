from django.urls import path

import notes.views

app_name = "notes"

urlpatterns = [
    path("", notes.views.NotesPageView.as_view(), name="index"),
]


__all__ = ()

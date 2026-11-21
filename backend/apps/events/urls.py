from django.urls import include, re_path
from apps.events.views import (
    EventListCreateView,
    EventDetailView,
    JoinEventView,
    EventInvitePreviewView,
    LeaveEventView,
    RegenerateInviteCodeView,
    EventMembersView,
    EventMemberRevokeView,
)
from apps.photos.views import EventPhotosZipDownloadView

urlpatterns = [
    re_path(r"^join/?$", JoinEventView.as_view(), name="event-join"),
    re_path(r"^invite/(?P<code>[^/]+)/?$", EventInvitePreviewView.as_view(), name="event-invite-preview"),
    re_path(r"^(?P<event_id>[^/]+)/photos/", include("apps.photos.urls")),
    re_path(r"^(?P<pk>[^/]+)/download/?$", EventPhotosZipDownloadView.as_view(), name="event-zip-download"),
    re_path(r"^(?P<pk>[^/]+)/leave/?$", LeaveEventView.as_view(), name="event-leave"),
    re_path(r"^(?P<pk>[^/]+)/regenerate-invite-code/?$", RegenerateInviteCodeView.as_view(), name="event-regenerate-invite-code"),
    re_path(r"^(?P<pk>[^/]+)/members/?$", EventMembersView.as_view(), name="event-members"),
    re_path(r"^(?P<pk>[^/]+)/members/(?P<user_id>[^/]+)/?$", EventMemberRevokeView.as_view(), name="event-member-revoke"),
    re_path(r"^(?P<pk>[^/]+)/?$", EventDetailView.as_view(), name="event-detail"),
    re_path(r"^$", EventListCreateView.as_view(), name="event-list-create"),
]

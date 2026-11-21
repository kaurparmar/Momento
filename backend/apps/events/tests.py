from datetime import datetime, timedelta
import mongoengine
import mongomock
import pytest
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User
from apps.events.models import Event, Membership
from apps.photos.models import Photo


@pytest.fixture(autouse=True)
def setup_test_db():
    """Isolate tests in mock database and reset cache."""
    mongoengine.disconnect()
    mongoengine.connect("test_events_db", host="localhost", mongo_client_class=mongomock.MongoClient)
    Event.drop_collection()
    Membership.drop_collection()
    Photo.drop_collection()
    User.drop_collection()
    cache.clear()
    yield
    Event.drop_collection()
    Membership.drop_collection()
    Photo.drop_collection()
    User.drop_collection()
    cache.clear()
    mongoengine.disconnect()


def create_user(email="user@example.com", name="Test User"):
    user = User(email=email, display_name=name)
    user.set_password("SecurePass123")
    user.save()
    return user


def auth_client_for(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


class TestEventModelBasics:
    def test_generate_invite_code_is_unique(self):
        codes = {Event.generate_invite_code() for _ in range(100)}
        assert len(codes) == 100

    def test_generate_invite_code_length(self):
        code = Event.generate_invite_code()
        assert len(code) >= 20

    def test_event_has_required_fields(self):
        assert "name" in Event._fields
        assert "description" in Event._fields
        assert "start_date" in Event._fields
        assert "end_date" in Event._fields
        assert "cover_photo" in Event._fields
        assert "owner" in Event._fields
        assert "invite_code" in Event._fields
        assert "created_at" in Event._fields
        assert "updated_at" in Event._fields

    def test_membership_has_required_fields(self):
        assert "user" in Membership._fields
        assert "event" in Membership._fields
        assert "role" in Membership._fields
        assert "joined_at" in Membership._fields


class TestEventCreate:
    def test_create_event_success(self):
        owner = create_user("owner@example.com", "Owner User")
        client = auth_client_for(owner)

        payload = {
            "name": "Trip to Kyoto",
            "description": "Autumn photography trip",
            "start_date": "2026-11-20T10:00:00Z",
            "end_date": "2026-11-25T18:00:00Z",
            "cover_photo": "https://example.com/kyoto.jpg",
        }
        response = client.post("/api/events/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Trip to Kyoto"
        assert response.data["description"] == "Autumn photography trip"
        assert response.data["cover_photo"] == "https://example.com/kyoto.jpg"
        assert response.data["owner"]["email"] == "owner@example.com"
        assert response.data["my_role"] == "owner"
        assert response.data["member_count"] == 1
        assert len(response.data["invite_code"]) >= 20

        # Verify database documents
        event = Event.objects(name="Trip to Kyoto").first()
        assert event is not None
        assert str(event.owner.id) == str(owner.id)

        membership = Membership.objects(user=owner, event=event).first()
        assert membership is not None
        assert membership.role == Membership.ROLE_OWNER

    def test_create_event_unauthenticated(self):
        client = APIClient()
        response = client.post("/api/events/", {"name": "Unauthorized Trip"}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_event_invalid_date_range(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)

        payload = {
            "name": "Invalid Dates",
            "start_date": "2026-11-25T10:00:00Z",
            "end_date": "2026-11-20T10:00:00Z",
        }
        response = client.post("/api/events/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "end_date" in response.data


class TestEventListMyEvents:
    def test_list_my_events_only_returns_events_where_user_is_member(self):
        user_a = create_user("user_a@example.com", "Alice")
        user_b = create_user("user_b@example.com", "Bob")

        client_a = auth_client_for(user_a)
        client_b = auth_client_for(user_b)

        # Alice creates Event 1
        res1 = client_a.post("/api/events/", {"name": "Alice Event"}, format="json")
        event1_id = res1.data["id"]

        # Bob creates Event 2
        res2 = client_b.post("/api/events/", {"name": "Bob Event"}, format="json")
        event2_id = res2.data["id"]

        # Alice lists events: sees only Event 1
        list_a = client_a.get("/api/events/")
        assert list_a.status_code == status.HTTP_200_OK
        ids_a = [e["id"] for e in list_a.data]
        assert event1_id in ids_a
        assert event2_id not in ids_a

        # Bob lists events: sees only Event 2
        list_b = client_b.get("/api/events/")
        assert list_b.status_code == status.HTTP_200_OK
        ids_b = [e["id"] for e in list_b.data]
        assert event2_id in ids_b
        assert event1_id not in ids_b

        # Bob joins Event 1
        event1 = Event.objects.get(id=event1_id)
        client_b.post("/api/events/join/", {"invite_code": event1.invite_code}, format="json")

        # Now Bob sees both events
        list_b_after = client_b.get("/api/events/")
        ids_b_after = [e["id"] for e in list_b_after.data]
        assert event1_id in ids_b_after
        assert event2_id in ids_b_after

    def test_list_events_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/events/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestEventRetrievePermissions:
    def test_retrieve_event_as_owner(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.post("/api/events/", {"name": "Owner Trip"}, format="json")
        event_id = res.data["id"]

        get_res = client.get(f"/api/events/{event_id}/")
        assert get_res.status_code == status.HTTP_200_OK
        assert get_res.data["name"] == "Owner Trip"
        assert get_res.data["my_role"] == "owner"

    def test_retrieve_event_as_joined_member(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Shared Trip"}, format="json")
        event_id = res.data["id"]
        invite_code = res.data["invite_code"]

        member = create_user("member@example.com")
        client_member = auth_client_for(member)
        client_member.post("/api/events/join/", {"invite_code": invite_code}, format="json")

        get_res = client_member.get(f"/api/events/{event_id}/")
        assert get_res.status_code == status.HTTP_200_OK
        assert get_res.data["name"] == "Shared Trip"
        assert get_res.data["my_role"] == "member"

    def test_retrieve_event_as_non_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Private Trip"}, format="json")
        event_id = res.data["id"]

        non_member = create_user("outsider@example.com")
        client_outsider = auth_client_for(non_member)

        # Outsider is not a member, must receive 403 Forbidden
        get_res = client_outsider.get(f"/api/events/{event_id}/")
        assert get_res.status_code == status.HTTP_403_FORBIDDEN
        assert "permission" in str(get_res.data).lower()

    def test_retrieve_nonexistent_event_returns_404(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        response = client.get("/api/events/654321012345678901234567/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestEventUpdatePermissions:
    def test_update_event_as_owner_success(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.post("/api/events/", {"name": "Initial Name"}, format="json")
        event_id = res.data["id"]

        patch_res = client.patch(
            f"/api/events/{event_id}/",
            {"name": "Updated Name", "description": "Updated Description"},
            format="json",
        )
        assert patch_res.status_code == status.HTTP_200_OK
        assert patch_res.data["name"] == "Updated Name"
        assert patch_res.data["description"] == "Updated Description"

    def test_update_event_as_regular_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Trip"}, format="json")
        event_id = res.data["id"]
        invite_code = res.data["invite_code"]

        member = create_user("member@example.com")
        client_member = auth_client_for(member)
        client_member.post("/api/events/join/", {"invite_code": invite_code}, format="json")

        patch_res = client_member.patch(f"/api/events/{event_id}/", {"name": "Hacked Name"}, format="json")
        assert patch_res.status_code == status.HTTP_403_FORBIDDEN

    def test_update_event_as_non_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Trip"}, format="json")
        event_id = res.data["id"]

        outsider = create_user("outsider@example.com")
        client_outsider = auth_client_for(outsider)

        patch_res = client_outsider.patch(f"/api/events/{event_id}/", {"name": "Hacked Name"}, format="json")
        assert patch_res.status_code == status.HTTP_403_FORBIDDEN


class TestEventDeletePermissions:
    def test_delete_event_as_owner_success(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.post("/api/events/", {"name": "Event To Delete"}, format="json")
        event_id = res.data["id"]
        event = Event.objects.get(id=event_id)
        Photo(
            event=event,
            uploader=owner,
            original_file="photos/test-original.jpg",
            thumbnail="photos/test-thumbnail.jpg",
            medium_preview="photos/test-medium.jpg",
            width=1200,
            height=800,
            taken_at=datetime.utcnow(),
            size_bytes=1024,
        ).save()

        del_res = client.delete(f"/api/events/{event_id}/")
        assert del_res.status_code == status.HTTP_204_NO_CONTENT

        # Verify event, memberships, and photo records are gone
        assert Event.objects(id=event_id).first() is None
        assert Membership.objects(event=event_id).count() == 0
        assert Photo.objects(event=event_id).count() == 0

    def test_delete_event_as_regular_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Trip"}, format="json")
        event_id = res.data["id"]
        invite_code = res.data["invite_code"]

        member = create_user("member@example.com")
        client_member = auth_client_for(member)
        client_member.post("/api/events/join/", {"invite_code": invite_code}, format="json")

        del_res = client_member.delete(f"/api/events/{event_id}/")
        assert del_res.status_code == status.HTTP_403_FORBIDDEN
        assert Event.objects(id=event_id).first() is not None

    def test_delete_event_as_non_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Trip"}, format="json")
        event_id = res.data["id"]

        outsider = create_user("outsider@example.com")
        client_outsider = auth_client_for(outsider)

        del_res = client_outsider.delete(f"/api/events/{event_id}/")
        assert del_res.status_code == status.HTTP_403_FORBIDDEN


class TestJoinEvent:
    def test_join_event_success(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Birthday Party"}, format="json")
        invite_code = res.data["invite_code"]

        joiner = create_user("joiner@example.com", "Guest User")
        client_joiner = auth_client_for(joiner)

        join_res = client_joiner.post("/api/events/join/", {"invite_code": invite_code}, format="json")
        assert join_res.status_code == status.HTTP_201_CREATED
        assert "Successfully joined" in join_res.data["detail"]
        assert join_res.data["event"]["name"] == "Birthday Party"
        assert join_res.data["event"]["member_count"] == 2

    def test_join_event_already_member(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Birthday Party"}, format="json")
        invite_code = res.data["invite_code"]

        # Owner joins own event again
        join_res = client_owner.post("/api/events/join/", {"invite_code": invite_code}, format="json")
        assert join_res.status_code == status.HTTP_200_OK
        assert "already a member" in join_res.data["detail"]

    def test_join_event_invalid_code(self):
        user = create_user("user@example.com")
        client = auth_client_for(user)

        join_res = client.post("/api/events/join/", {"invite_code": "nonexistent-code-123"}, format="json")
        assert join_res.status_code == status.HTTP_404_NOT_FOUND


class TestInvitePreview:
    def test_invite_preview_returns_event_name_and_member_count_only(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Music Festival"}, format="json")
        invite_code = res.data["invite_code"]

        guest_client = APIClient()  # Unauthenticated
        preview_res = guest_client.get(f"/api/events/invite/{invite_code}/")
        assert preview_res.status_code == status.HTTP_200_OK
        assert set(preview_res.data.keys()) == {"name", "member_count"}
        assert preview_res.data["name"] == "Music Festival"
        assert preview_res.data["member_count"] == 1

    def test_invite_preview_invalid_code_returns_404(self):
        guest_client = APIClient()
        preview_res = guest_client.get("/api/events/invite/invalid-code/")
        assert preview_res.status_code == status.HTTP_404_NOT_FOUND


class TestLeaveEvent:
    def test_regular_member_can_leave_event(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Hiking Trip"}, format="json")
        event_id = res.data["id"]
        invite_code = res.data["invite_code"]

        member = create_user("member@example.com")
        client_member = auth_client_for(member)
        client_member.post("/api/events/join/", {"invite_code": invite_code}, format="json")

        # Member leaves
        leave_res = client_member.post(f"/api/events/{event_id}/leave/", format="json")
        assert leave_res.status_code == status.HTTP_200_OK
        assert "Successfully left" in leave_res.data["detail"]

        # Now member cannot retrieve event
        check_res = client_member.get(f"/api/events/{event_id}/")
        assert check_res.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_cannot_leave_event(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.post("/api/events/", {"name": "Solo Event"}, format="json")
        event_id = res.data["id"]

        leave_res = client.post(f"/api/events/{event_id}/leave/", format="json")
        assert leave_res.status_code == status.HTTP_400_BAD_REQUEST
        assert "owner cannot leave" in leave_res.data["detail"].lower()

    def test_non_member_cannot_leave_event(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Solo Event"}, format="json")
        event_id = res.data["id"]

        outsider = create_user("outsider@example.com")
        client_outsider = auth_client_for(outsider)

        leave_res = client_outsider.post(f"/api/events/{event_id}/leave/", format="json")
        assert leave_res.status_code == status.HTTP_400_BAD_REQUEST


class TestEventMembers:
    def test_owner_can_list_event_members(self):
        owner = create_user("owner@example.com", "Owner")
        owner_client = auth_client_for(owner)
        event_response = owner_client.post("/api/events/", {"name": "Shared Event"}, format="json")
        event_id = event_response.data["id"]

        member = create_user("member@example.com", "Member")
        member_client = auth_client_for(member)
        member_client.post(
            "/api/events/join/",
            {"invite_code": event_response.data["invite_code"]},
            format="json",
        )

        response = owner_client.get(f"/api/events/{event_id}/members/")

        assert response.status_code == status.HTTP_200_OK
        assert {item["email"] for item in response.data} == {
            "owner@example.com",
            "member@example.com",
        }
        assert {item["role"] for item in response.data} == {
            Membership.ROLE_OWNER,
            Membership.ROLE_MEMBER,
        }
        member_data = next(item for item in response.data if item["email"] == "member@example.com")
        assert member_data["user_id"] == str(member.id)
        assert member_data["display_name"] == "Member"

    def test_only_owner_can_list_event_members(self):
        owner = create_user("owner@example.com")
        owner_client = auth_client_for(owner)
        event_response = owner_client.post("/api/events/", {"name": "Shared Event"}, format="json")
        member = create_user("member@example.com")
        member_client = auth_client_for(member)
        member_client.post(
            "/api/events/join/",
            {"invite_code": event_response.data["invite_code"]},
            format="json",
        )

        response = member_client.get(f"/api/events/{event_response.data['id']}/members/")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_owner_can_revoke_member_access(self):
        owner = create_user("owner@example.com")
        owner_client = auth_client_for(owner)
        event_response = owner_client.post("/api/events/", {"name": "Shared Event"}, format="json")
        event_id = event_response.data["id"]
        member = create_user("member@example.com")
        member_client = auth_client_for(member)
        member_client.post(
            "/api/events/join/",
            {"invite_code": event_response.data["invite_code"]},
            format="json",
        )

        response = owner_client.delete(f"/api/events/{event_id}/members/{member.id}/")

        assert response.status_code == status.HTTP_200_OK
        assert response.data["invite_code"] != event_response.data["invite_code"]
        assert Membership.objects(user=member, event=Event.objects.get(id=event_id)).first() is None
        assert member_client.get(f"/api/events/{event_id}/").status_code == status.HTTP_403_FORBIDDEN
        assert APIClient().get(
            f"/api/events/invite/{event_response.data['invite_code']}/"
        ).status_code == status.HTTP_404_NOT_FOUND

    def test_owner_cannot_revoke_own_access(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        event_response = client.post("/api/events/", {"name": "Owner Event"}, format="json")

        response = client.delete(
            f"/api/events/{event_response.data['id']}/members/{owner.id}/"
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert Membership.objects(user=owner).count() == 1

    def test_non_owner_cannot_revoke_member_access(self):
        owner = create_user("owner@example.com")
        owner_client = auth_client_for(owner)
        event_response = owner_client.post("/api/events/", {"name": "Shared Event"}, format="json")
        member = create_user("member@example.com")
        member_client = auth_client_for(member)
        member_client.post(
            "/api/events/join/",
            {"invite_code": event_response.data["invite_code"]},
            format="json",
        )
        another_member = create_user("another@example.com")
        auth_client_for(another_member).post(
            "/api/events/join/",
            {"invite_code": event_response.data["invite_code"]},
            format="json",
        )

        response = member_client.delete(
            f"/api/events/{event_response.data['id']}/members/{another_member.id}/"
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Membership.objects(user=another_member).first() is not None


class TestRegenerateInviteCode:
    def test_regenerate_invite_code_as_owner(self):
        owner = create_user("owner@example.com")
        client = auth_client_for(owner)
        res = client.post("/api/events/", {"name": "Secret Party"}, format="json")
        event_id = res.data["id"]
        old_code = res.data["invite_code"]

        regen_res = client.post(f"/api/events/{event_id}/regenerate-invite-code/", format="json")
        assert regen_res.status_code == status.HTTP_200_OK
        new_code = regen_res.data["invite_code"]
        assert new_code != old_code

        # Old code now returns 404
        guest = APIClient()
        old_preview = guest.get(f"/api/events/invite/{old_code}/")
        assert old_preview.status_code == status.HTTP_404_NOT_FOUND

        # New code works
        new_preview = guest.get(f"/api/events/invite/{new_code}/")
        assert new_preview.status_code == status.HTTP_200_OK

    def test_regenerate_invite_code_as_regular_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Party"}, format="json")
        event_id = res.data["id"]
        invite_code = res.data["invite_code"]

        member = create_user("member@example.com")
        client_member = auth_client_for(member)
        client_member.post("/api/events/join/", {"invite_code": invite_code}, format="json")

        regen_res = client_member.post(f"/api/events/{event_id}/regenerate-invite-code/", format="json")
        assert regen_res.status_code == status.HTTP_403_FORBIDDEN

    def test_regenerate_invite_code_as_non_member_returns_403(self):
        owner = create_user("owner@example.com")
        client_owner = auth_client_for(owner)
        res = client_owner.post("/api/events/", {"name": "Party"}, format="json")
        event_id = res.data["id"]

        outsider = create_user("outsider@example.com")
        client_outsider = auth_client_for(outsider)

        regen_res = client_outsider.post(f"/api/events/{event_id}/regenerate-invite-code/", format="json")
        assert regen_res.status_code == status.HTTP_403_FORBIDDEN

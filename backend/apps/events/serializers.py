from rest_framework import serializers
from apps.events.models import Event, Membership


class EventSerializer(serializers.Serializer):
    """Detailed representation of an event."""

    id = serializers.CharField(source="pk", read_only=True)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    start_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    cover_photo = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)
    owner = serializers.SerializerMethodField()
    invite_code = serializers.CharField(read_only=True)
    member_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_owner(self, obj):
        if not obj.owner:
            return None
        return {
            "id": str(obj.owner.id),
            "email": obj.owner.email,
            "display_name": getattr(obj.owner, "display_name", ""),
        }

    def get_member_count(self, obj):
        return Membership.objects(event=obj).count()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if request and getattr(request, "user", None) and request.user.is_authenticated:
            membership = Membership.objects(user=request.user, event=obj).first()
            return membership.role if membership else None
        return None

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return attrs


class EventCreateUpdateSerializer(serializers.Serializer):
    """Serializer used for creating and updating events."""

    name = serializers.CharField(max_length=200, required=True)
    description = serializers.CharField(max_length=1000, required=False, allow_blank=True, default="")
    start_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    end_date = serializers.DateTimeField(required=False, allow_null=True, default=None)
    cover_photo = serializers.CharField(required=False, allow_null=True, allow_blank=True, default=None)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        event = Event(
            name=validated_data["name"],
            description=validated_data.get("description", ""),
            start_date=validated_data.get("start_date"),
            end_date=validated_data.get("end_date"),
            cover_photo=validated_data.get("cover_photo"),
            owner=user,
            invite_code=Event.generate_invite_code(),
        )
        event.save()

        # Automatically make creator the owner member
        Membership(
            user=user,
            event=event,
            role=Membership.ROLE_OWNER,
        ).save()

        return event

    def update(self, instance, validated_data):
        instance.name = validated_data.get("name", instance.name)
        if "description" in validated_data:
            instance.description = validated_data["description"]
        if "start_date" in validated_data:
            instance.start_date = validated_data["start_date"]
        if "end_date" in validated_data:
            instance.end_date = validated_data["end_date"]
        if "cover_photo" in validated_data:
            instance.cover_photo = validated_data["cover_photo"]
        instance.save()
        return instance


class JoinEventSerializer(serializers.Serializer):
    """Serializer for joining an event with invite code."""

    invite_code = serializers.CharField(required=True, trim_whitespace=True)


class MembershipSerializer(serializers.Serializer):
    """Member details exposed to the event owner."""

    user_id = serializers.CharField(source="user.id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    display_name = serializers.CharField(source="user.display_name", read_only=True)
    role = serializers.CharField(read_only=True)
    joined_at = serializers.DateTimeField(read_only=True)


class InvitePreviewSerializer(serializers.Serializer):
    """Public preview serializer returning event name and member count only."""

    name = serializers.CharField(read_only=True)
    member_count = serializers.IntegerField(read_only=True)

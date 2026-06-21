from rest_framework import serializers
from apps.logistics.models import Transporter, LoadPost, LogisticsPool, PoolMembership, FleetBooking
from apps.accounts.serializers import UserSerializer

class TransporterSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Transporter
        fields = [
            'id', 'user', 'user_detail', 'company_name',
            'vehicle_type', 'vehicle_capacity_kg', 'license_number',
            'is_verified', 'rating', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'rating', 'is_verified', 'created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role != 'TRANSPORTER' and user.role != 'ADMIN':
            raise serializers.ValidationError(
                "Only users with the TRANSPORTER role can register transporter profiles."
            )
        if Transporter.objects.filter(user=user).exists():
            raise serializers.ValidationError(
                "You have already registered a transporter profile."
            )
        return attrs


class LoadPostSerializer(serializers.ModelSerializer):
    creator_detail = UserSerializer(source='creator', read_only=True)

    class Meta:
        model = LoadPost
        fields = [
            'id', 'creator', 'creator_detail', 'commodity',
            'weight_kg', 'origin_district', 'destination_district',
            'target_pickup_date', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'creator', 'status', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role not in ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'COMMERCIAL_BUYER', 'RETAIL_BUYER', 'ADMIN']:
            raise serializers.ValidationError(
                "Only Farmers and Buyers can create transport load requests."
            )
        return attrs


class PoolMembershipSerializer(serializers.ModelSerializer):
    load_post_detail = LoadPostSerializer(source='load_post', read_only=True)

    class Meta:
        model = PoolMembership
        fields = [
            'id', 'load_post', 'load_post_detail', 'logistics_pool',
            'cost_share_cents', 'joined_at'
        ]
        read_only_fields = ['id', 'joined_at']


class LogisticsPoolSerializer(serializers.ModelSerializer):
    memberships = PoolMembershipSerializer(many=True, read_only=True)
    departure_date = serializers.SerializerMethodField()
    commodity_type = serializers.SerializerMethodField()
    max_capacity_kg = serializers.SerializerMethodField()
    current_weight_kg = serializers.SerializerMethodField()
    cost_per_kg_cents = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = LogisticsPool
        fields = [
            'id', 'origin_district', 'destination_district',
            'total_weight_kg', 'status', 'memberships',
            'departure_date', 'commodity_type', 'max_capacity_kg',
            'current_weight_kg', 'cost_per_kg_cents', 'member_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_weight_kg', 'status', 'created_at', 'updated_at']

    def get_departure_date(self, obj):
        dates = [m.load_post.target_pickup_date for m in obj.memberships.all() if m.load_post.target_pickup_date]
        if dates:
            return str(min(dates))
        return str(obj.created_at.date())

    def get_commodity_type(self, obj):
        commodities = {m.load_post.commodity.name for m in obj.memberships.all() if m.load_post.commodity}
        if commodities:
            return ", ".join(sorted(commodities))
        return "General Grains"

    def get_max_capacity_kg(self, obj):
        return 5000

    def get_current_weight_kg(self, obj):
        return obj.total_weight_kg

    def get_cost_per_kg_cents(self, obj):
        if obj.total_weight_kg > 0:
            total_cost = 25000 + (obj.total_weight_kg * 5)
            return int(total_cost / obj.total_weight_kg)
        return 15

    def get_member_count(self, obj):
        return obj.memberships.count()



class FleetBookingSerializer(serializers.ModelSerializer):
    transporter_detail = TransporterSerializer(source='transporter', read_only=True)
    booked_by_detail = UserSerializer(source='booked_by', read_only=True)

    class Meta:
        model = FleetBooking
        fields = [
            'id', 'transporter', 'transporter_detail', 'logistics_pool',
            'load_post', 'booked_by', 'booked_by_detail', 'status',
            'agreed_cost_cents', 'booking_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'booked_by', 'status', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role not in ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'COMMERCIAL_BUYER', 'RETAIL_BUYER', 'ADMIN']:
            raise serializers.ValidationError(
                "Only Farmers and Buyers can create fleet bookings."
            )
        load_post = attrs.get('load_post')
        if load_post and load_post.creator != user and user.role != 'ADMIN':
            raise serializers.ValidationError(
                "You can only book transport for load posts that you created."
            )
        return attrs

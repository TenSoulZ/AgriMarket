from rest_framework import serializers
from .models import Commodity, CommodityPrice, PriceAlert, PriceIndex

class CommoditySerializer(serializers.ModelSerializer):
    class Meta:
        model = Commodity
        fields = ['id', 'name', 'description', 'category', 'search_keys', 'standard_unit', 'hs_code', 'is_active']


class CommodityPriceSerializer(serializers.ModelSerializer):
    commodity_detail = CommoditySerializer(source='commodity', read_only=True)

    class Meta:
        model = CommodityPrice
        fields = [
            'id', 'commodity', 'commodity_detail', 'district',
            'price_per_tonne_usd_cents', 'recorded_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PriceAlertSerializer(serializers.ModelSerializer):
    commodity_detail = CommoditySerializer(source='commodity', read_only=True)
    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = PriceAlert
        fields = [
            'id', 'user', 'user_detail', 'commodity', 'commodity_detail',
            'district', 'target_price_usd_cents', 'alert_type',
            'is_triggered', 'created_at'
        ]
        read_only_fields = ['id', 'user', 'is_triggered', 'created_at']

    def get_user_detail(self, obj):
        from apps.accounts.serializers import UserSerializer
        return UserSerializer(obj.user).data


class PriceIndexSerializer(serializers.ModelSerializer):
    commodity_detail = CommoditySerializer(source='commodity', read_only=True)

    class Meta:
        model = PriceIndex
        fields = [
            'id', 'commodity', 'commodity_detail',
            'average_price_usd_cents', 'volume_tonnes', 'calculated_date'
        ]
        read_only_fields = ['id']

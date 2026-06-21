from rest_framework import serializers
from .models import Category, Listing, WholesaleListing, ListingImage
from apps.accounts.serializers import UserSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description']


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image', 'uploaded_at']


class ListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    farmer_detail = UserSerializer(source='farmer', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Listing
        fields = [
            'id', 'farmer', 'farmer_detail', 'title', 'description', 'category', 'category_name',
            'price_per_kg_usd_cents', 'quantity_available_kg', 
            'location_province', 'location_district', 'images', 
            'uploaded_images', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Enforce Farmer role
        if user.role not in ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'ADMIN']:
            raise serializers.ValidationError(
                "Only Farmers can create marketplace listings."
            )
            
        # 1. Enforce KYC verified condition
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before posting marketplace listings."
            )
            
        # 2. Enforce SEED tier active listing limit
        if user.subscription_tier == 'SEED':
            active_count = Listing.objects.filter(farmer=user, is_active=True).count()
            # If updating an existing active listing, it shouldn't trigger the limit
            is_update = self.instance is not None
            if not is_update and active_count >= 3:
                raise serializers.ValidationError(
                    "Seed tier accounts are limited to a maximum of 3 active listings. "
                    "Upgrade to Harvest tier for unlimited listings."
                )

        return attrs

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        validated_data['farmer'] = self.context['request'].user
        
        listing = Listing.objects.create(**validated_data)
        
        # Save attached files
        for img in uploaded_images:
            ListingImage.objects.create(listing=listing, image=img)
            
        return listing


class WholesaleListingSerializer(serializers.ModelSerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(allow_empty_file=False, use_url=False),
        write_only=True,
        required=False
    )
    farmer_detail = UserSerializer(source='farmer', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    commodity_name = serializers.CharField(source='commodity.name', read_only=True)

    class Meta:
        model = WholesaleListing
        fields = [
            'id', 'farmer', 'farmer_detail', 'commodity', 'commodity_name', 'title', 'description', 'category', 'category_name',
            'price_per_tonne_usd_cents', 'quantity_available_tonnes', 
            'min_order_quantity_tonnes', 'quality_grade', 'moisture_content_pct', 
            'harvest_date', 'images', 'uploaded_images', 'is_active', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # 1. Enforce KYC verified
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before listing on the wholesale board."
            )
            
        # 2. Enforce COMMERCIAL role and tier constraints
        if user.role != 'COMMERCIAL_FARMER' or user.subscription_tier != 'COMMERCIAL':
            raise serializers.ValidationError(
                "Wholesale listings can only be posted by Commercial Farmers on the Commercial subscription tier."
            )
            
        # 3. Enforce minimum order quantity (minimum 1 tonne)
        min_qty = attrs.get('min_order_quantity_tonnes', 1.0)
        if min_qty < 1.0:
            raise serializers.ValidationError(
                {"min_order_quantity_tonnes": "Wholesale listings must specify a minimum order quantity of at least 1 tonne."}
            )

        return attrs

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        validated_data['farmer'] = self.context['request'].user
        
        wholesale_listing = WholesaleListing.objects.create(**validated_data)
        
        for img in uploaded_images:
            ListingImage.objects.create(wholesale_listing=wholesale_listing, image=img)
            
        return wholesale_listing

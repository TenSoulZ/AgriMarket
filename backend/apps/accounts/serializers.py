from rest_framework import serializers
from .models import User, FarmProfile, CommercialBuyerProfile, PhoneOTP, phone_regex
from apps.market_data.serializers import CommoditySerializer
from apps.market_data.models import Commodity
import re

class OTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        # Normalize and validate format
        cleaned = value.strip().replace(" ", "")
        if cleaned.startswith('0'):
            cleaned = '+263' + cleaned[1:]
        
        if not re.match(r'^\+263(77|78|71|73)\d{7}$', cleaned):
            raise serializers.ValidationError(
                "Phone number must be a valid Zimbabwean mobile number (+26377X, +26378X, +26371X, +26373X)"
            )
        return cleaned


class OTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate_phone_number(self, value):
        cleaned = value.strip().replace(" ", "")
        if cleaned.startswith('0'):
            cleaned = '+263' + cleaned[1:]
        return cleaned


class FarmProfileSerializer(serializers.ModelSerializer):
    primary_commodities_detail = CommoditySerializer(source='primary_commodities', many=True, read_only=True)
    primary_commodities = serializers.PrimaryKeyRelatedField(
        queryset=Commodity.objects.all(), 
        many=True, 
        write_only=True,
        required=False
    )

    class Meta:
        model = FarmProfile
        fields = [
            'id', 'farm_name', 'farm_size_hectares', 'farm_location_lat', 
            'farm_location_lng', 'certified_organic', 'gapps_certified', 
            'primary_commodities', 'primary_commodities_detail', 
            'annual_production_tonnes', 'irrigation_type'
        ]


class CommercialBuyerProfileSerializer(serializers.ModelSerializer):
    preferred_commodities_detail = CommoditySerializer(source='preferred_commodities', many=True, read_only=True)
    preferred_commodities = serializers.PrimaryKeyRelatedField(
        queryset=Commodity.objects.all(), 
        many=True, 
        write_only=True,
        required=False
    )

    class Meta:
        model = CommercialBuyerProfile
        fields = [
            'id', 'company_name', 'company_registration_number', 'buyer_type', 
            'annual_procurement_budget_usd', 'preferred_commodities', 
            'preferred_commodities_detail', 'delivery_addresses'
        ]


class UserSerializer(serializers.ModelSerializer):
    farm_profile = FarmProfileSerializer(read_only=True)
    commercial_buyer_profile = CommercialBuyerProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'email', 'role', 'subscription_tier', 
            'kyc_status', 'province', 'district', 'trust_score', 
            'is_commercially_approved', 'farm_profile', 'commercial_buyer_profile',
            'payout_channel', 'payout_destination', 'payout_bank_name', 'payout_account_name',
            'date_joined'
        ]
        read_only_fields = [
            'id', 'phone_number', 'subscription_tier', 'kyc_status', 
            'trust_score', 'is_commercially_approved', 'date_joined'
        ]

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request:
            farm_data = request.data.get('farm_profile')
            if farm_data and hasattr(instance, 'farm_profile'):
                farm_profile = instance.farm_profile
                for attr, value in farm_data.items():
                    setattr(farm_profile, attr, value)
                farm_profile.save()

            buyer_data = request.data.get('commercial_buyer_profile')
            if buyer_data and hasattr(instance, 'commercial_buyer_profile'):
                buyer_profile = instance.commercial_buyer_profile
                for attr, value in buyer_data.items():
                    setattr(buyer_profile, attr, value)
                buyer_profile.save()

        return super().update(instance, validated_data)




class RegisterSerializer(serializers.ModelSerializer):
    farm_profile = FarmProfileSerializer(required=False)
    commercial_buyer_profile = CommercialBuyerProfileSerializer(required=False)

    class Meta:
        model = User
        fields = [
            'phone_number', 'email', 'role', 'province', 'district',
            'farm_profile', 'commercial_buyer_profile'
        ]

    def validate_phone_number(self, value):
        cleaned = value.strip().replace(" ", "")
        if cleaned.startswith('0'):
            cleaned = '+263' + cleaned[1:]
        
        if not re.match(r'^\+263(77|78|71|73)\d{7}$', cleaned):
            raise serializers.ValidationError(
                "Phone number must be a valid Zimbabwean mobile number (+26377X, +26378X, +26371X, +26373X)"
            )
            
        if User.objects.filter(phone_number=cleaned).exists():
            raise serializers.ValidationError("A user with this phone number already exists.")
            
        return cleaned

    def validate(self, attrs):
        role = attrs.get('role')
        email = attrs.get('email')

        # Enforce business rules
        if role in ['COMMERCIAL_FARMER', 'COMMERCIAL_BUYER']:
            if not email:
                raise serializers.ValidationError(
                    {"email": "Email address is required for commercial user accounts."}
                )

        return attrs

    def create(self, validated_data):
        farm_profile_data = validated_data.pop('farm_profile', None)
        buyer_profile_data = validated_data.pop('commercial_buyer_profile', None)

        # Save user as inactive until verified via OTP
        user = User.objects.create_user(
            phone_number=validated_data['phone_number'],
            email=validated_data.get('email'),
            role=validated_data['role'],
            province=validated_data['province'],
            district=validated_data['district'],
            is_active=False
        )

        # Create profiles dynamically based on roles
        if user.role in ['SMALLHOLDER_FARMER', 'COMMERCIAL_FARMER'] and farm_profile_data:
            primary_commodities = farm_profile_data.pop('primary_commodities', [])
            farm = FarmProfile.objects.create(user=user, **farm_profile_data)
            if primary_commodities:
                farm.primary_commodities.set(primary_commodities)

        elif user.role == 'COMMERCIAL_BUYER' and buyer_profile_data:
            preferred_commodities = buyer_profile_data.pop('preferred_commodities', [])
            buyer = CommercialBuyerProfile.objects.create(user=user, **buyer_profile_data)
            if preferred_commodities:
                buyer.preferred_commodities.set(preferred_commodities)

        return user


class KYCDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'national_id_photo', 'selfie_photo', 
            'business_registration_doc', 'tax_clearance_doc'
        ]

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Check registration doc requirement for COMMERCIAL tier
        if user.role in ['COMMERCIAL_FARMER', 'COMMERCIAL_BUYER']:
            # business registration document is required
            if 'business_registration_doc' not in attrs and not user.business_registration_doc:
                raise serializers.ValidationError(
                    {"business_registration_doc": "Business registration document is required for commercial roles."}
                )
                
        return attrs

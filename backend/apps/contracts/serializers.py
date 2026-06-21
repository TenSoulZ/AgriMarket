from rest_framework import serializers
from .models import RFQ, RFQQuote, BulkContract, ContractMilestone, ForwardContract, ContractDocument
from apps.accounts.serializers import UserSerializer

class RFQQuoteSerializer(serializers.ModelSerializer):
    farmer_detail = UserSerializer(source='farmer', read_only=True)

    class Meta:
        model = RFQQuote
        fields = [
            'id', 'rfq', 'farmer', 'farmer_detail', 'price_per_tonne_usd_cents', 
            'qty_tonnes', 'availability_date', 'notes', 'is_accepted'
        ]
        read_only_fields = ['id', 'farmer', 'is_accepted']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Enforce that only verified Commercial Farmers on Commercial tier can quote
        if user.role != 'COMMERCIAL_FARMER' or user.subscription_tier != 'COMMERCIAL':
            raise serializers.ValidationError(
                "Only Commercial Farmers on the Commercial subscription tier can submit quotes to RFQs."
            )
            
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before quoting."
            )
            
        return attrs


class RFQSerializer(serializers.ModelSerializer):
    quotes = RFQQuoteSerializer(many=True, read_only=True)
    buyer_detail = UserSerializer(source='buyer', read_only=True)

    class Meta:
        model = RFQ
        fields = [
            'id', 'buyer', 'buyer_detail', 'commodity', 'qty_tonnes', 
            'quality_spec', 'delivery_district', 'deadline', 'status', 'quotes'
        ]
        read_only_fields = ['id', 'buyer', 'status']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Enforce that only verified Commercial Buyers on Commercial tier can post RFQs
        if user.role != 'COMMERCIAL_BUYER' or user.subscription_tier != 'COMMERCIAL':
            raise serializers.ValidationError(
                "Only Commercial Buyers on the Commercial subscription tier can post RFQs."
            )
            
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before posting RFQs."
            )
            
        # Commercial buyers must be vetted/approved by an admin
        if not user.is_commercially_approved:
            raise serializers.ValidationError(
                "Your Commercial Buyer account must be approved by an administrator before posting RFQs."
            )
            
        return attrs


class ContractMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractMilestone
        fields = ['id', 'contract', 'milestone_index', 'description', 'deposit_pct', 'due_condition', 'is_paid']
        read_only_fields = ['id', 'contract']


class BulkContractSerializer(serializers.ModelSerializer):
    milestones = ContractMilestoneSerializer(many=True, read_only=True)
    farmer_detail = UserSerializer(source='farmer', read_only=True)
    buyer_detail = UserSerializer(source='buyer', read_only=True)

    class Meta:
        model = BulkContract
        fields = [
            'id', 'rfq', 'winning_quote', 'farmer', 'farmer_detail', 'buyer', 'buyer_detail',
            'commodity', 'total_qty_tonnes', 'price_per_tonne_usd_cents', 
            'status', 'terms_text', 'milestones', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'farmer', 'buyer', 'status', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Verify user is COMMERCIAL tier or ADMIN
        if user.subscription_tier != 'COMMERCIAL' and user.role != 'ADMIN':
            raise serializers.ValidationError(
                "Access to bulk contract management requires a Commercial subscription."
            )
            
        return attrs


class ForwardContractSerializer(serializers.ModelSerializer):
    farmer_detail = UserSerializer(source='farmer', read_only=True)
    buyer_detail = UserSerializer(source='buyer', read_only=True)

    class Meta:
        model = ForwardContract
        fields = [
            'id', 'farmer', 'farmer_detail', 'buyer', 'buyer_detail', 'commodity', 
            'qty_tonnes', 'delivery_date', 'fixed_price_per_tonne_usd_cents', 
            'deposit_pct', 'status', 'accepted_at', 'created_at'
        ]
        read_only_fields = ['id', 'farmer', 'buyer', 'status', 'accepted_at', 'created_at']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Verify user has COMMERCIAL subscription
        if user.subscription_tier != 'COMMERCIAL':
            raise serializers.ValidationError(
                "Forward contracts are restricted to the Commercial subscription tier."
            )
            
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before using forward contracts."
            )
            
        return attrs


class ContractDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContractDocument
        fields = ['id', 'contract', 'forward_contract', 'document_file', 'document_type', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

from rest_framework import serializers
from .models import Order, EscrowTransaction, EscrowLog
from apps.accounts.serializers import UserSerializer
from apps.listings.serializers import ListingSerializer, WholesaleListingSerializer
from apps.contracts.serializers import BulkContractSerializer

class EscrowLogSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source='actor', read_only=True)

    class Meta:
        model = EscrowLog
        fields = ['id', 'actor', 'actor_detail', 'old_status', 'new_status', 'ip_address', 'timestamp', 'notes']


class EscrowTransactionSerializer(serializers.ModelSerializer):
    logs = EscrowLogSerializer(many=True, read_only=True)

    class Meta:
        model = EscrowTransaction
        fields = ['id', 'order', 'amount_cents', 'status', 'dispute_reason', 'logs', 'created_at', 'updated_at']
        read_only_fields = ['id', 'order', 'status', 'created_at', 'updated_at']


class OrderSerializer(serializers.ModelSerializer):
    escrow_transactions = EscrowTransactionSerializer(many=True, read_only=True)
    buyer_detail = UserSerializer(source='buyer', read_only=True)
    seller_detail = UserSerializer(source='seller', read_only=True)
    listing_detail = ListingSerializer(source='listing', read_only=True)
    wholesale_listing_detail = WholesaleListingSerializer(source='wholesale_listing', read_only=True)
    bulk_contract_detail = BulkContractSerializer(source='bulk_contract', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'buyer', 'buyer_detail', 'seller', 'seller_detail', 
            'listing', 'listing_detail', 'wholesale_listing', 'wholesale_listing_detail',
            'bulk_contract', 'bulk_contract_detail', 'qty', 
            'total_price_usd_cents', 'is_large_order', 'escrow_transactions',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'buyer', 'seller', 'is_large_order', 'created_at', 'updated_at']

    def validate(self, attrs):
        user = self.context['request'].user
        
        # Enforce Buyer role
        if user.role not in ['COMMERCIAL_BUYER', 'RETAIL_BUYER', 'ADMIN']:
            raise serializers.ValidationError(
                "Only Buyers can place marketplace orders."
            )
            
        # 1. Check if user is verified
        if user.kyc_status != 'VERIFIED':
            raise serializers.ValidationError(
                "You must complete KYC verification before placing orders."
            )
            
        # 2. Check Seed tier restriction
        if user.subscription_tier == 'SEED':
            raise serializers.ValidationError(
                "Seed tier accounts cannot transact via platform orders/escrow. "
                "Please upgrade to Harvest tier or higher."
            )

        # 3. Retrieve listing and seller
        listing = attrs.get('listing')
        wholesale_listing = attrs.get('wholesale_listing')
        bulk_contract = attrs.get('bulk_contract')
        
        seller = None
        if listing:
            seller = listing.farmer
        elif wholesale_listing:
            seller = wholesale_listing.farmer
        elif bulk_contract:
            seller = bulk_contract.farmer
            
        if not seller:
            raise serializers.ValidationError("Order must reference an active listing or bulk contract.")
            
        # 4. Enforce self-ordering block
        if seller == user:
            raise serializers.ValidationError("You cannot place an order on your own listing or contract.")
            
        # 5. Enforce $5,000 USD tax clearance vetting rule for bulk orders
        total_price = attrs.get('total_price_usd_cents', 0)
        is_bulk = bool(wholesale_listing or bulk_contract)
        if is_bulk and total_price >= 500000: # $5,000 USD in cents
            if not user.tax_clearance_doc:
                raise serializers.ValidationError(
                    "Buyers placing bulk orders exceeding $5,000 USD must have a verified tax clearance document on their profile."
                )

        return attrs


    def create(self, validated_data):
        buyer = self.context['request'].user
        listing = validated_data.get('listing')
        wholesale_listing = validated_data.get('wholesale_listing')
        bulk_contract = validated_data.get('bulk_contract')
        
        seller = None
        if listing:
            seller = listing.farmer
        elif wholesale_listing:
            seller = wholesale_listing.farmer
        elif bulk_contract:
            seller = bulk_contract.farmer

        order = Order.objects.create(
            buyer=buyer,
            seller=seller,
            **validated_data
        )
        
        # Automatically create the corresponding PENDING EscrowTransaction
        # If it's a large order, we will initialize the escrow transaction for the total amount
        EscrowTransaction.objects.create(
            order=order,
            amount_cents=order.total_price_usd_cents,
            status='PENDING'
        )
        
        return order

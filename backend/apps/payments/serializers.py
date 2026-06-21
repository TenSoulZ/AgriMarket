from rest_framework import serializers
from apps.payments.models import Payment
from apps.orders.models import Order

class InitiatePaymentSerializer(serializers.Serializer):
    payment_type = serializers.ChoiceField(choices=Payment.PAYMENT_TYPE_CHOICES)
    order_id = serializers.IntegerField(required=False, allow_null=True)
    subscription_tier = serializers.ChoiceField(choices=[('HARVEST', 'Harvest Tier ($5)'), ('ENTERPRISE', 'Enterprise Tier ($25)'), ('COMMERCIAL', 'Commercial Tier ($80)')], required=False, allow_blank=True)

    def validate(self, attrs):
        payment_type = attrs.get('payment_type')
        order_id = attrs.get('order_id')
        subscription_tier = attrs.get('subscription_tier')

        if payment_type == 'ESCROW':
            if not order_id:
                raise serializers.ValidationError({"order_id": "Order ID is required for Escrow payments."})
            try:
                order = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                raise serializers.ValidationError({"order_id": "Order does not exist."})
            attrs['order'] = order
            attrs['amount_cents'] = order.total_price_usd_cents
        elif payment_type == 'SUBSCRIPTION':
            if not subscription_tier:
                raise serializers.ValidationError({"subscription_tier": "Subscription tier is required for subscription payments."})
            
            # Map tier to USD cents
            tier_prices = {
                'HARVEST': 500,       # $5.00
                'ENTERPRISE': 2500,   # $25.00
                'COMMERCIAL': 8000,   # $80.00
            }
            attrs['amount_cents'] = tier_prices.get(subscription_tier)
            if not attrs['amount_cents']:
                raise serializers.ValidationError({"subscription_tier": "Invalid subscription tier."})
        
        return attrs

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'payment_type', 'amount_cents', 
            'order', 'subscription_tier', 'paynow_reference', 
            'poll_url', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'paynow_reference', 'poll_url', 'status', 'created_at', 'updated_at']

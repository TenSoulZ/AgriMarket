import logging
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.payments.models import Payment
from apps.payments.serializers import InitiatePaymentSerializer, PaymentSerializer
from apps.payments.paynow_client import PaynowClient
from apps.orders.models import EscrowTransaction, EscrowLog
from apps.accounts.models import User

logger = logging.getLogger(__name__)

class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = InitiatePaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        payment_type = validated_data['payment_type']
        order = validated_data.get('order')
        subscription_tier = validated_data.get('subscription_tier', '')
        amount_cents = validated_data['amount_cents']
        
        # Create Payment record inside a transaction
        with transaction.atomic():
            payment = Payment.objects.create(
                user=request.user,
                payment_type=payment_type,
                amount_cents=amount_cents,
                order=order,
                subscription_tier=subscription_tier,
                status='PENDING'
            )
        
        # Build reference
        reference = f"PAY-{payment.id}"
        authemail = request.user.email or f"user_{request.user.id}@agrimarket.co.zw"
        
        # Call Paynow Client
        client = PaynowClient()
        response_data = client.initiate_transaction(
            reference=reference,
            amount_cents=amount_cents,
            authemail=authemail,
            additional_info=f"{payment_type} payment"
        )
        
        if response_data.get('status', '').lower() == 'ok':
            payment.paynow_reference = response_data.get('paynowreference', '')
            payment.poll_url = response_data.get('pollurl', '')
            payment.save()
            
            return Response({
                "payment": PaymentSerializer(payment).data,
                "redirect_url": response_data.get('browserurl'),
                "poll_url": response_data.get('pollurl'),
            }, status=status.HTTP_201_CREATED)
        else:
            payment.status = 'FAILED'
            payment.save()
            return Response({
                "error": "Failed to initiate payment with Paynow.",
                "details": response_data.get('error', 'Unknown error')
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class PaynowWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Paynow webhook data is sent as form-urlencoded POST parameters
        data = request.data.dict() if hasattr(request.data, 'dict') else dict(request.data)
        
        logger.info(f"Received Paynow Webhook: {data}")
        
        client = PaynowClient()
        if not client.verify_hash(data):
            logger.error("Paynow webhook hash verification failed.")
            return Response({"error": "Invalid signature hash"}, status=status.HTTP_400_BAD_REQUEST)
        
        reference = data.get('reference')
        if not reference or not reference.startswith('PAY-'):
            logger.error(f"Invalid reference received: {reference}")
            return Response({"error": "Invalid reference"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            payment_id = int(reference.split('-')[1])
            payment = Payment.objects.get(id=payment_id)
        except (ValueError, Payment.DoesNotExist):
            logger.error(f"Payment record not found for reference: {reference}")
            return Response({"error": "Payment not found"}, status=status.HTTP_400_BAD_REQUEST)
        
        paynow_status = data.get('status', '').lower()
        
        # Status mappings: 'paid', 'awaiting delivery', etc.
        # Paynow documentation states successful states: 'paid', 'sent' (for mobile wallets/airtime), 'awaiting delivery'
        success_statuses = ['paid', 'awaiting delivery', 'delivered', 'sent']
        
        with transaction.atomic():
            # Avoid processing duplicate success webhooks
            if payment.status == 'PAID':
                return Response({"status": "Already processed"}, status=status.HTTP_200_OK)
                
            if paynow_status in success_statuses:
                payment.status = 'PAID'
                payment.paynow_reference = data.get('paynowreference', payment.paynow_reference)
                payment.save()
                
                # Execute payment type logic
                if payment.payment_type == 'ESCROW' and payment.order:
                    # Get or create escrow transaction and transition it
                    order = payment.order
                    try:
                        escrow = EscrowTransaction.objects.get(order=order)
                        if escrow.status == 'PENDING':
                            escrow.hold_payment()
                            escrow.save()
                            
                            # Log transition
                            EscrowLog.objects.create(
                                escrow=escrow,
                                actor=payment.user,
                                old_status='PENDING',
                                new_status=escrow.status,
                                notes="Escrow payment held. Confirmed via webhook."
                            )
                    except EscrowTransaction.DoesNotExist:
                        escrow = EscrowTransaction.objects.create(
                            order=order,
                            amount_cents=payment.amount_cents,
                            status='HELD'
                        )
                        EscrowLog.objects.create(
                            escrow=escrow,
                            actor=payment.user,
                            old_status='PENDING',
                            new_status='HELD',
                            notes="Escrow payment created and held. Confirmed via webhook."
                        )
                
                elif payment.payment_type == 'SUBSCRIPTION':
                    user = payment.user
                    user.subscription_tier = payment.subscription_tier
                    user.save()
                    
            elif paynow_status in ['cancelled', 'failed']:
                payment.status = 'FAILED'
                payment.save()
                
        return Response({"status": "OK"}, status=status.HTTP_200_OK)

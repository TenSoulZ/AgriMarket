from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction


from .models import Order, EscrowTransaction, EscrowLog
from .serializers import OrderSerializer, EscrowTransactionSerializer

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

def log_escrow_transition(escrow, actor, old_status, new_status, ip, notes=""):
    EscrowLog.objects.create(
        escrow=escrow,
        actor=actor,
        old_status=old_status,
        new_status=new_status,
        ip_address=ip,
        notes=notes
    )


class OrderViewSet(viewsets.ModelViewSet):
    """
    Trade Orders ViewSet. 
    Handles order creation, listing orders, and escrow control actions (release/dispute).
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Order.objects.all()
        # Users see orders where they are the buyer or the seller
        return Order.objects.filter(Q(buyer=user) | Q(seller=user))

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    @action(detail=True, methods=['post'], url_path='escrow/release')
    def release_escrow(self, request, pk=None):
        """
        Action for the buyer to confirm delivery and release the held funds to the seller.
        """
        order = self.get_object()
        if order.buyer != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "Only the buyer of the order can release escrow funds."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Get active escrow transaction
        escrow = get_object_or_404(EscrowTransaction, order=order)
        old_status = escrow.status
        
        if escrow.status not in ['HELD', 'FULLY_HELD']:
            return Response(
                {"error": f"Escrow cannot be released from current state: {escrow.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        with transaction.atomic():
            # Transition FSM state
            escrow.release_payment()
            escrow.save()
            
            # Log transition
            log_escrow_transition(
                escrow=escrow,
                actor=request.user,
                old_status=old_status,
                new_status=escrow.status,
                ip=get_client_ip(request),
                notes="Buyer confirmed delivery. Escrow funds released to seller."
            )
            
            # Trigger payout background processing task
            from apps.payments.tasks import process_escrow_payout
            transaction.on_commit(lambda: process_escrow_payout.delay(escrow.id))
            
        return Response(EscrowTransactionSerializer(escrow).data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='escrow/dispute')
    def dispute_escrow(self, request, pk=None):
        """
        Action for the buyer to flag a delivery shortfall or quality dispute, freezing funds.
        """
        order = self.get_object()
        if order.buyer != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "Only the buyer can raise a dispute on escrow funds."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        reason = request.data.get('reason')
        if not reason:
            return Response(
                {"error": "Dispute reason is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        escrow = get_object_or_404(EscrowTransaction, order=order)
        old_status = escrow.status
        
        if escrow.status not in ['HELD', 'FULLY_HELD']:
            return Response(
                {"error": f"Cannot dispute escrow in current status: {escrow.status}."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Transition FSM
        escrow.dispute_payment(reason=reason)
        escrow.save()
        
        # Log transition
        log_escrow_transition(
            escrow=escrow,
            actor=request.user,
            old_status=old_status,
            new_status=escrow.status,
            ip=get_client_ip(request),
            notes=f"Buyer raised dispute. Reason: {reason}"
        )
        
        return Response(EscrowTransactionSerializer(escrow).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='escrow/resolve-dispute')
    def resolve_dispute(self, request, pk=None):
        """
        Administrative action to resolve a dispute by either refunding the buyer or releasing to the seller.
        """
        if request.user.role != 'ADMIN':
            return Response(
                {"error": "Only platform administrators can resolve disputes."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        order = self.get_object()
        resolution = request.data.get('resolution') # 'RELEASE' or 'REFUND'
        notes = request.data.get('notes', '')
        
        if resolution not in ['RELEASE', 'REFUND']:
            return Response(
                {"error": "Resolution must be either 'RELEASE' (to seller) or 'REFUND' (to buyer)."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        escrow = get_object_or_404(EscrowTransaction, order=order)
        old_status = escrow.status
        
        if escrow.status != 'DISPUTED':
            return Response(
                {"error": "Only disputed transactions can be resolved."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        with transaction.atomic():
            if resolution == 'RELEASE':
                escrow.resolve_dispute_to_seller()
                log_notes = f"Admin resolved dispute in seller's favor. {notes}"
            else:
                escrow.refund_payment()
                log_notes = f"Admin resolved dispute in buyer's favor (Refunded). {notes}"
                
            escrow.save()
            
            # Log transition
            log_escrow_transition(
                escrow=escrow,
                actor=request.user,
                old_status=old_status,
                new_status=escrow.status,
                ip=get_client_ip(request),
                notes=log_notes
            )
            
            # Trigger payout background processing task
            from apps.payments.tasks import process_escrow_payout
            transaction.on_commit(lambda: process_escrow_payout.delay(escrow.id))
            
        return Response(EscrowTransactionSerializer(escrow).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='invoice')
    def get_invoice(self, request, pk=None):
        """
        Generates structured JSON data for a downloadable PDF invoice.
        Requires the Order's EscrowTransaction to be RELEASED.
        """
        order = self.get_object()
        if order.buyer != request.user and order.seller != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "You do not have permission to view this invoice."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        escrow = get_object_or_404(EscrowTransaction, order=order)
        
        # Enforce that invoice is only available if funds are released (except for admins testing)
        if escrow.status != 'RELEASED' and request.user.role != 'ADMIN':
            return Response(
                {"error": "Invoices are strictly generated after Escrow funds are fully released and the transaction is finalized."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Financial logic: 2.5% platform fee, 15% VAT on the fee
        subtotal = float(order.total_price_usd_cents) / 100.0
        platform_fee = subtotal * 0.025
        tax = platform_fee * 0.15
        total_paid = subtotal + platform_fee + tax

        # Retrieve buyer commercial profile details
        buyer_company = ""
        buyer_reg = ""
        if order.buyer.role == 'COMMERCIAL_BUYER':
            try:
                buyer_company = order.buyer.commercial_buyer_profile.company_name
                buyer_reg = order.buyer.commercial_buyer_profile.company_registration_number
            except Exception:
                pass

        # Retrieve seller farm profile details
        seller_farm = ""
        if order.seller.role in ['SMALLHOLDER_FARMER', 'COMMERCIAL_FARMER']:
            try:
                seller_farm = order.seller.farm_profile.farm_name
            except Exception:
                pass
        
        invoice_data = {
            "invoice_number": f"TXINV-AM-{order.id}-{order.created_at.strftime('%Y%m%d')}",
            "issue_date": order.updated_at.strftime('%Y-%m-%d'),
            "status": "PAID" if escrow.status == 'RELEASED' else escrow.status,
            "platform": {
                "name": "AgriMarket Zimbabwe Escrow Services Pvt Ltd",
                "vat_number": "10087452",
                "bp_number": "0200364719",
                "address": "108 Herbert Chitepo Avenue, Avenues, Harare",
                "compliance_act": "Registered Platform Facilitator - ZIMRA VAT Act [Chapter 23:12]"
            },
            "buyer": {
                "name": f"{order.buyer.first_name} {order.buyer.last_name}".strip() or order.buyer.phone_number,
                "company_name": buyer_company,
                "registration_number": buyer_reg,
                "phone": order.buyer.phone_number,
                "role": order.buyer.role,
                "bp_number": f"0200{100000 + order.buyer.id}" if buyer_reg else ""
            },
            "seller": {
                "name": f"{order.seller.first_name} {order.seller.last_name}".strip() or order.seller.phone_number,
                "farm_name": seller_farm,
                "phone": order.seller.phone_number,
                "role": order.seller.role,
                "bp_number": f"0200{200000 + order.seller.id}" if seller_farm else ""
            },
            "line_items": [
                {
                    "description": f"Agricultural Bulk Trade (Raw Crop) - {order.qty} Units (Order #{order.id}) - VAT Zero-Rated",
                    "amount": round(subtotal, 2)
                },
                {
                    "description": "AgriMarket Secure Escrow Fee (2.5%) - Standard Rated (15%)",
                    "amount": round(platform_fee, 2)
                },
                {
                    "description": "Value Added Tax (15% VAT on Platform Escrow Fee)",
                    "amount": round(tax, 2)
                }
            ],
            "subtotal_amount": round(subtotal, 2),
            "escrow_fee_amount": round(platform_fee, 2),
            "vat_amount": round(tax, 2),
            "total_amount_usd": round(total_paid, 2)
        }
        
        return Response(invoice_data, status=status.HTTP_200_OK)


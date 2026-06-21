from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import RFQ, RFQQuote, BulkContract, ContractMilestone, ForwardContract, ContractDocument
from .serializers import (
    RFQSerializer,
    RFQQuoteSerializer,
    BulkContractSerializer,
    ContractMilestoneSerializer,
    ForwardContractSerializer,
    ContractDocumentSerializer,
)

class RFQViewSet(viewsets.ModelViewSet):
    """
    RFQ lifecycle viewset:
    - Buyers post requests.
    - Farmers list requests and submit quotes.
    - Buyer awards contract.
    """
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admins see all
        if user.role == 'ADMIN':
            return RFQ.objects.all()
        # Buyers see their own
        if user.role == 'COMMERCIAL_BUYER':
            return RFQ.objects.filter(buyer=user)
        # Farmers see published requests
        return RFQ.objects.filter(status__in=['PUBLISHED', 'UNDER_OFFER'])

    def perform_create(self, serializer):
        if self.request.user.role not in ['COMMERCIAL_BUYER', 'RETAIL_BUYER', 'ADMIN']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Buyers can create RFQs.")
        serializer.save(buyer=self.request.user, status='PUBLISHED')

    @action(detail=True, methods=['post'], url_path='quotes')
    def submit_quote(self, request, pk=None):
        """
        Action for a farmer to submit a quote on a published RFQ.
        """
        if request.user.role not in ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'ADMIN']:
            return Response(
                {"error": "Only Farmers can submit quotes on RFQs."},
                status=status.HTTP_403_FORBIDDEN
            )
        rfq = self.get_object()
        if rfq.status not in ['PUBLISHED', 'UNDER_OFFER']:
            return Response(
                {"error": "This RFQ is not accepting quotes."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        serializer = RFQQuoteSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            quote = serializer.save(rfq=rfq, farmer=request.user)
            
            # Transition RFQ state to UNDER_OFFER if first quote
            if rfq.status == 'PUBLISHED':
                rfq.start_receiving_quotes()
                rfq.save()
                
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='award')
    def award_quote(self, request, pk=None):
        """
        Action for the RFQ buyer to award the contract to a specific quote.
        """
        rfq = self.get_object()
        if rfq.buyer != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "You do not have permission to award quotes on this RFQ."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        quote_id = request.data.get('quote_id')
        if not quote_id:
            return Response(
                {"error": "Winning quote_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        quote = get_object_or_404(RFQQuote, id=quote_id, rfq=rfq)
        
        # Transition RFQ status
        rfq.award()
        rfq.save()
        
        quote.is_accepted = True
        quote.save()
        
        # De-select/Reject other quotes
        rfq.quotes.exclude(id=quote.id).update(is_accepted=False)
        
        # Create BulkContract automatically
        contract = BulkContract.objects.create(
            rfq=rfq,
            winning_quote=quote,
            farmer=quote.farmer,
            buyer=rfq.buyer,
            commodity=rfq.commodity,
            total_qty_tonnes=quote.qty_tonnes,
            price_per_tonne_usd_cents=quote.price_per_tonne_usd_cents,
            terms_text=quote.notes or f"Bulk contract for {rfq.commodity.name} agreed via RFQ Quote."
        )
        
        # Create default milestones: 40% deposit, 60% upon delivery confirmation
        ContractMilestone.objects.create(
            contract=contract,
            milestone_index=1,
            description="Deposit payment",
            deposit_pct=40.0,
            due_condition="Pay within 48h to activate contract"
        )
        ContractMilestone.objects.create(
            contract=contract,
            milestone_index=2,
            description="Balance payment",
            deposit_pct=60.0,
            due_condition="Pay upon successful delivery confirmation"
        )
        
        return Response(BulkContractSerializer(contract).data, status=status.HTTP_201_CREATED)


class BulkContractViewSet(viewsets.ModelViewSet):
    """
    Bulk Contracts ViewSet.
    """
    queryset = BulkContract.objects.all()
    serializer_class = BulkContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return BulkContract.objects.all()
        # Buyers see contracts they bought; Farmers see contracts they sell
        return BulkContract.objects.filter(Q(buyer=user) | Q(farmer=user))

    @action(detail=True, methods=['post'], url_path='pay-deposit')
    def pay_deposit(self, request, pk=None):
        """
        Transition status to DEPOSIT_PAID after Paynow validates deposit receipt.
        Checks tax clearance requirement for contracts exceeding $5,000.
        """
        contract = self.get_object()
        
        if contract.buyer != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "Only the contracting buyer can pay the deposit."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            # Transition check (governs FSM + checks buyer.tax_clearance_doc if > $5000 USD)
            contract.pay_deposit()
            contract.save()
            return Response(
                {
                    "message": "Deposit marked as paid. Contract is ready for fulfilment.",
                    "status": contract.status
                },
                status=status.HTTP_200_OK
            )
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """
        Confirm delivery and release escrow.
        """
        contract = self.get_object()
        if contract.buyer != request.user and request.user.role != 'ADMIN':
            return Response(
                {"error": "Only the buyer can confirm complete delivery."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        contract.complete_delivery()
        contract.save()
        return Response({"status": contract.status}, status=status.HTTP_200_OK)


class ForwardContractViewSet(viewsets.ModelViewSet):
    """
    Forward Contracts board ViewSet.
    """
    queryset = ForwardContract.objects.all()
    serializer_class = ForwardContractSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return ForwardContract.objects.all()
        # Users see active published forwards, or ones they are directly party to
        return ForwardContract.objects.filter(
            Q(status='PUBLISHED') | 
            Q(farmer=user) | 
            Q(buyer=user)
        )

    def perform_create(self, serializer):
        if self.request.user.role not in ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'ADMIN']:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only Farmers can create forward contracts.")
        serializer.save(farmer=self.request.user, status='PUBLISHED')

    @action(detail=True, methods=['post'], url_path='accept')
    def accept(self, request, pk=None):
        """
        Action for a buyer to accept a published forward contract offer.
        Locks pricing and starts 48h payment window.
        """
        forward_contract = self.get_object()
        if forward_contract.status != 'PUBLISHED':
            return Response(
                {"error": "This forward contract is not available for purchase."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if request.user.role != 'ADMIN' and (request.user.role != 'COMMERCIAL_BUYER' or request.user.subscription_tier != 'COMMERCIAL'):
            return Response(
                {"error": "Only Commercial Buyers on Commercial subscription tier can accept forward contracts."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        forward_contract.accept(buyer=request.user)
        forward_contract.save()
        
        return Response(
            {
                "message": "Forward contract accepted. Deposit must be paid within 48 hours.",
                "status": forward_contract.status,
                "accepted_at": forward_contract.accepted_at
            },
            status=status.HTTP_200_OK
        )

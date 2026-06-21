from django.db import models
from django.conf import settings
from django.utils import timezone
from django_fsm import FSMField, transition
from apps.market_data.models import Commodity

class RFQ(models.Model):
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='rfqs',
        verbose_name="Commercial Buyer"
    )
    commodity = models.ForeignKey(
        Commodity, 
        on_delete=models.PROTECT, 
        related_name='rfqs',
        verbose_name="Commodity"
    )
    qty_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity Required (Tonnes)")
    quality_spec = models.TextField(verbose_name="Quality Specifications")
    delivery_district = models.CharField(max_length=100, verbose_name="Delivery District")
    deadline = models.DateTimeField(verbose_name="RFQ Deadline")
    
    # State Machine using django-fsm
    status = FSMField(default='DRAFT', verbose_name="RFQ Status")

    class Meta:
        ordering = ['-deadline']
        verbose_name = "Request for Quotation"
        verbose_name_plural = "Requests for Quotations"

    def __str__(self):
        return f"RFQ #{self.id} - {self.qty_tonnes} tonnes of {self.commodity.name}"

    @transition(field=status, source='DRAFT', target='PUBLISHED')
    def publish(self):
        pass

    @transition(field=status, source='PUBLISHED', target='UNDER_OFFER')
    def start_receiving_quotes(self):
        pass

    @transition(field=status, source=['PUBLISHED', 'UNDER_OFFER'], target='AWARDED')
    def award(self):
        pass

    @transition(field=status, source=['DRAFT', 'PUBLISHED', 'UNDER_OFFER'], target='CANCELLED')
    def cancel(self):
        pass


class RFQQuote(models.Model):
    rfq = models.ForeignKey(
        RFQ, 
        on_delete=models.CASCADE, 
        related_name='quotes',
        verbose_name="RFQ"
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='rfq_quotes',
        verbose_name="Commercial Farmer"
    )
    price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Price per Tonne (USD cents)")
    qty_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity Offered (Tonnes)")
    availability_date = models.DateField(verbose_name="Date of Availability")
    notes = models.TextField(blank=True, verbose_name="Notes / Terms")
    is_accepted = models.BooleanField(default=False, verbose_name="Is Accepted")

    class Meta:
        ordering = ['price_per_tonne_usd_cents']
        verbose_name = "RFQ Quote"
        verbose_name_plural = "RFQ Quotes"

    def __str__(self):
        return f"Quote #{self.id} from {self.farmer.phone_number} on RFQ #{self.rfq.id}"


class BulkContract(models.Model):
    rfq = models.ForeignKey(
        RFQ, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='contracts',
        verbose_name="Originating RFQ"
    )
    winning_quote = models.OneToOneField(
        RFQQuote, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Winning Quote"
    )
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='farmer_contracts',
        verbose_name="Commercial Farmer"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='buyer_contracts',
        verbose_name="Commercial Buyer"
    )
    commodity = models.ForeignKey(
        Commodity, 
        on_delete=models.PROTECT, 
        related_name='contracts',
        verbose_name="Commodity"
    )
    total_qty_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Total Quantity (Tonnes)")
    price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Contract Price per Tonne (USD cents)")
    
    # State Machine using django-fsm
    status = FSMField(default='AWARDED', verbose_name="Contract Status")
    
    terms_text = models.TextField(verbose_name="Contract Terms & Conditions")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Bulk Contract"
        verbose_name_plural = "Bulk Contracts"

    def __str__(self):
        return f"Contract #{self.id} between Farmer {self.farmer.phone_number} and Buyer {self.buyer.phone_number}"

    @property
    def total_value_cents(self):
        # Convert total qty to float to multiply with integer cents
        return int(float(self.total_qty_tonnes) * self.price_per_tonne_usd_cents)

    @transition(field=status, source='AWARDED', target='DEPOSIT_PAID')
    def pay_deposit(self):
        # Enforce tax clearance validation rule (> $5000 USD)
        if self.total_value_cents > 500000: # $5,000 USD in cents
            if not self.buyer.tax_clearance_doc:
                raise ValueError("Tax clearance document is required from the buyer for contracts above $5,000 USD.")

    @transition(field=status, source='DEPOSIT_PAID', target='IN_FULFILMENT')
    def start_fulfilment(self):
        pass

    @transition(field=status, source='IN_FULFILMENT', target='COMPLETED')
    def complete_delivery(self):
        pass

    @transition(field=status, source='IN_FULFILMENT', target='DISPUTED')
    def raise_dispute(self):
        pass

    @transition(field=status, source='DISPUTED', target='RESOLVED')
    def resolve_dispute(self):
        pass

    @transition(field=status, source=['AWARDED', 'DEPOSIT_PAID'], target='CANCELLED')
    def cancel(self):
        pass


class ContractMilestone(models.Model):
    contract = models.ForeignKey(
        BulkContract, 
        on_delete=models.CASCADE, 
        related_name='milestones',
        verbose_name="Bulk Contract"
    )
    milestone_index = models.PositiveIntegerField(verbose_name="Milestone Index")
    description = models.CharField(max_length=200, verbose_name="Milestone Milestone Description")
    deposit_pct = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Payment Percentage (%)")
    due_condition = models.CharField(max_length=250, verbose_name="Trigger/Condition to Pay")
    is_paid = models.BooleanField(default=False, verbose_name="Is Paid")

    class Meta:
        ordering = ['contract', 'milestone_index']
        verbose_name = "Contract Milestone"
        verbose_name_plural = "Contract Milestones"

    def __str__(self):
        return f"Milestone {self.milestone_index} for Contract #{self.contract.id} ({self.deposit_pct}%)"


class ForwardContract(models.Model):
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='farmer_forward_contracts',
        verbose_name="Farmer"
    )
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='buyer_forward_contracts',
        null=True, 
        blank=True,
        verbose_name="Buyer"
    )
    commodity = models.ForeignKey(
        Commodity, 
        on_delete=models.PROTECT, 
        related_name='forward_contracts',
        verbose_name="Commodity"
    )
    qty_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity (Tonnes)")
    delivery_date = models.DateField(verbose_name="Scheduled Delivery Date")
    fixed_price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Fixed Price per Tonne (USD cents)")
    deposit_pct = models.DecimalField(max_digits=5, decimal_places=2, default=20.0, verbose_name="Required Deposit (%)")
    
    # State Machine using django-fsm
    status = FSMField(default='DRAFT', verbose_name="Forward Contract Status")
    
    accepted_at = models.DateTimeField(null=True, blank=True, verbose_name="Accepted At")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-delivery_date']
        verbose_name = "Forward Contract"
        verbose_name_plural = "Forward Contracts"

    def __str__(self):
        return f"Forward Contract #{self.id} - {self.qty_tonnes} tonnes of {self.commodity.name} by {self.farmer.phone_number}"

    @transition(field=status, source='DRAFT', target='PUBLISHED')
    def publish(self):
        pass

    @transition(field=status, source='PUBLISHED', target='ACCEPTED')
    def accept(self, buyer):
        self.buyer = buyer
        self.accepted_at = timezone.now()

    @transition(field=status, source='ACCEPTED', target='DEPOSIT_PAID')
    def pay_deposit(self):
        pass

    @transition(field=status, source='DEPOSIT_PAID', target='COMPLETED')
    def complete(self):
        pass

    @transition(field=status, source=['DRAFT', 'PUBLISHED', 'ACCEPTED'], target='CANCELLED')
    def cancel(self):
        pass


class ContractDocument(models.Model):
    DOC_TYPES = [
        ('SIGNED_PDF', 'Signed PDF Contract'),
        ('QUALITY_CERT', 'Quality Certificate'),
        ('DELIVERY_NOTE', 'Delivery Note'),
        ('OTHER', 'Other'),
    ]

    contract = models.ForeignKey(
        BulkContract, 
        on_delete=models.CASCADE, 
        related_name='documents', 
        null=True, 
        blank=True,
        verbose_name="Bulk Contract"
    )
    forward_contract = models.ForeignKey(
        ForwardContract, 
        on_delete=models.CASCADE, 
        related_name='documents', 
        null=True, 
        blank=True,
        verbose_name="Forward Contract"
    )
    document_file = models.FileField(upload_to='contracts/documents/', verbose_name="Document File")
    document_type = models.CharField(max_length=30, choices=DOC_TYPES, verbose_name="Document Type")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Uploaded At")

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Contract Document"
        verbose_name_plural = "Contract Documents"

    def __str__(self):
        associated = self.contract or self.forward_contract
        return f"{self.get_document_type_display()} for {associated}"

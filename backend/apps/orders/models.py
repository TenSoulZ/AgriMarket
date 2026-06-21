from django.db import models
from django.conf import settings
from django_fsm import FSMField, transition
from apps.listings.models import Listing, WholesaleListing
from apps.contracts.models import BulkContract

class Order(models.Model):
    buyer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='bought_orders',
        verbose_name="Buyer"
    )
    seller = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sold_orders',
        verbose_name="Seller"
    )
    listing = models.ForeignKey(
        Listing, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='orders',
        verbose_name="Retail Listing"
    )
    wholesale_listing = models.ForeignKey(
        WholesaleListing, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='orders',
        verbose_name="Wholesale Listing"
    )
    bulk_contract = models.ForeignKey(
        BulkContract, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='orders',
        verbose_name="Bulk Contract"
    )
    
    qty = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity Ordered")
    # Store monetary values as integers in USD cents
    total_price_usd_cents = models.PositiveIntegerField(verbose_name="Total Price (USD cents)")
    is_large_order = models.BooleanField(default=False, verbose_name="Is Large Order (>= $1000)")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"Order #{self.id} (Buyer: {self.buyer.phone_number} - Seller: {self.seller.phone_number})"

    def save(self, *args, **kwargs):
        # Automatically determine if this is a large order (>= $1,000 USD)
        if self.total_price_usd_cents >= 100000: # $1,000 in cents
            self.is_large_order = True
        super().save(*args, **kwargs)


class EscrowTransaction(models.Model):
    order = models.ForeignKey(
        Order, 
        on_delete=models.CASCADE, 
        related_name='escrow_transactions',
        verbose_name="Order"
    )
    amount_cents = models.PositiveIntegerField(verbose_name="Amount in Escrow (USD cents)")
    
    # State Machine using django-fsm
    status = FSMField(default='PENDING', verbose_name="Escrow Status")
    dispute_reason = models.TextField(blank=True, verbose_name="Dispute Reason")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Escrow Transaction"
        verbose_name_plural = "Escrow Transactions"

    def __str__(self):
        return f"Escrow #{self.id} for Order #{self.order.id} - Status: {self.status}"

    # Standard Transitions
    @transition(field=status, source='PENDING', target='HELD')
    def hold_payment(self):
        """Confirmed by Paynow webhook"""
        pass

    # Large Order Milestone Transitions
    @transition(field=status, source='PENDING', target='PARTIALLY_HELD')
    def hold_milestone_deposit(self):
        """Milestone deposit received"""
        pass

    @transition(field=status, source='PARTIALLY_HELD', target='FULLY_HELD')
    def hold_milestone_balance(self):
        """Milestone balance received"""
        pass

    # Release Transitions
    @transition(field=status, source=['HELD', 'FULLY_HELD'], target='RELEASED')
    def release_payment(self):
        """Released to seller"""
        pass

    # Dispute Transitions
    @transition(field=status, source=['HELD', 'FULLY_HELD'], target='DISPUTED')
    def dispute_payment(self, reason):
        """Dispute raised by buyer"""
        self.dispute_reason = reason

    @transition(field=status, source='DISPUTED', target='REFUNDED')
    def refund_payment(self):
        """Admin resolves in buyer's favor"""
        pass

    @transition(field=status, source='DISPUTED', target='RELEASED')
    def resolve_dispute_to_seller(self):
        """Admin resolves in seller's favor"""
        pass


class EscrowLog(models.Model):
    escrow = models.ForeignKey(
        EscrowTransaction, 
        on_delete=models.CASCADE, 
        related_name='logs',
        verbose_name="Escrow Transaction"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Actor"
    )
    old_status = models.CharField(max_length=50, verbose_name="Old Status")
    new_status = models.CharField(max_length=50, verbose_name="New Status")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP Address")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Timestamp")
    notes = models.TextField(blank=True, verbose_name="Notes")

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Escrow Log"
        verbose_name_plural = "Escrow Logs"

    def __str__(self):
        return f"Log #{self.id} - Escrow #{self.escrow.id} ({self.old_status} -> {self.new_status})"

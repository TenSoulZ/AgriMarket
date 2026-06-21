from django.db import models
from django.conf import settings
from apps.orders.models import Order

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('ESCROW', 'Escrow Payment'),
        ('SUBSCRIPTION', 'Subscription Payment'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="User"
    )
    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        verbose_name="Payment Type"
    )
    amount_cents = models.PositiveIntegerField(verbose_name="Amount (USD cents)")
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments',
        verbose_name="Order"
    )
    subscription_tier = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Subscription Tier"
    )
    paynow_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Paynow Reference"
    )
    poll_url = models.URLField(
        max_length=500,
        blank=True,
        verbose_name="Paynow Poll URL"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        verbose_name="Status"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payment"
        verbose_name_plural = "Payments"

    def __str__(self):
        return f"Payment #{self.id} - {self.payment_type} ({self.status}) - {self.amount_cents} cents"


class PayoutTransaction(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    escrow_transaction = models.ForeignKey(
        'orders.EscrowTransaction', 
        on_delete=models.CASCADE, 
        related_name='payouts',
        verbose_name="Escrow Transaction"
    )
    amount_cents = models.PositiveIntegerField(verbose_name="Amount (USD cents)")
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='payout_transactions',
        verbose_name="Recipient"
    )
    reference = models.CharField(max_length=50, unique=True, verbose_name="Payout Reference")
    paynow_reference = models.CharField(max_length=100, blank=True, verbose_name="Paynow Reference")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="Status")
    error_message = models.TextField(blank=True, verbose_name="Error Message")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payout Transaction"
        verbose_name_plural = "Payout Transactions"

    def __str__(self):
        return f"Payout #{self.id} - Ref: {self.reference} ({self.status}) - {self.amount_cents} cents"


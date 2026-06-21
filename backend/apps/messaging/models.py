from django.db import models
from django.conf import settings
from apps.contracts.models import BulkContract

class Conversation(models.Model):
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations',
        verbose_name="Participants"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-updated_at']
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"

    def __str__(self):
        participant_phones = ", ".join([u.phone_number for u in self.participants.all()])
        return f"Conversation #{self.id} between: {participant_phones}"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name="Conversation"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name="Sender"
    )
    text = models.TextField(verbose_name="Message Text")
    attachment = models.FileField(
        upload_to='chat_attachments/', 
        null=True, 
        blank=True, 
        verbose_name="Attachment"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['created_at']
        verbose_name = "Message"
        verbose_name_plural = "Messages"

    def __str__(self):
        return f"Message #{self.id} by {self.sender.phone_number} at {self.created_at}"


class ContractProposal(models.Model):
    contract = models.ForeignKey(
        BulkContract,
        on_delete=models.CASCADE,
        related_name='proposals',
        verbose_name="Bulk Contract"
    )
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contract_proposals',
        verbose_name="Proposed By"
    )
    price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Proposed Price per Tonne (USD cents)")
    qty_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Proposed Quantity (Tonnes)")
    deposit_pct = models.DecimalField(max_digits=5, decimal_places=2, default=20.0, verbose_name="Proposed Deposit (%)")
    terms_text = models.TextField(blank=True, verbose_name="Proposed Terms")
    is_accepted = models.BooleanField(default=False, verbose_name="Is Accepted")
    is_rejected = models.BooleanField(default=False, verbose_name="Is Rejected")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Contract Proposal"
        verbose_name_plural = "Contract Proposals"

    def __str__(self):
        return f"Proposal for Contract #{self.contract.id} by {self.proposed_by.phone_number} @ {self.price_per_tonne_usd_cents} cents/t"

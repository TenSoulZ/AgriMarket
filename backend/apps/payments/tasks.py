from datetime import timedelta
import logging
from django.utils import timezone
from django.db import transaction
from celery import shared_task

from apps.accounts.models import User
from apps.orders.models import EscrowTransaction, EscrowLog
from apps.payments.models import Payment

logger = logging.getLogger(__name__)

@shared_task
def auto_release_escrows():
    """
    Auto-releases escrow payments held or fully held:
    - 72 hours (3 days) for standard orders
    - 7 days for large orders (>= $1000)
    """
    now = timezone.now()
    held_escrows = EscrowTransaction.objects.filter(status__in=['HELD', 'FULLY_HELD'])
    released_count = 0

    for escrow in held_escrows:
        order = escrow.order
        elapsed = now - escrow.updated_at
        
        # Decide threshold
        if order.is_large_order:
            threshold = timedelta(days=7)
        else:
            threshold = timedelta(hours=72)
            
        if elapsed >= threshold:
            try:
                with transaction.atomic():
                    old_status = escrow.status
                    escrow.release_payment()
                    escrow.save()
                    
                    EscrowLog.objects.create(
                        escrow=escrow,
                        actor=None,  # System task
                        old_status=old_status,
                        new_status='RELEASED',
                        notes="Payment auto-released by scheduled Celery task after threshold elapsed."
                    )
                    released_count += 1
                    logger.info(f"Escrow #{escrow.id} for Order #{order.id} successfully auto-released.")
            except Exception as e:
                logger.error(f"Error auto-releasing escrow #{escrow.id}: {str(e)}")
                
    return f"Auto-released {released_count} escrows."


@shared_task
def check_subscriptions():
    """
    Daily task checking subscription validity.
    Downgrades users to SEED tier if their last paid subscription payment is > 30 days old.
    """
    now = timezone.now()
    cutoff = now - timedelta(days=30)
    
    active_sub_users = User.objects.filter(subscription_tier__in=['HARVEST', 'ENTERPRISE', 'COMMERCIAL'])
    downgraded_count = 0
    
    for user in active_sub_users:
        latest_payment = Payment.objects.filter(
            user=user,
            payment_type='SUBSCRIPTION',
            status='PAID'
        ).order_by('-created_at').first()
        
        if not latest_payment or latest_payment.created_at < cutoff:
            old_tier = user.subscription_tier
            user.subscription_tier = 'SEED'
            user.save()
            downgraded_count += 1
            logger.info(f"User {user.phone_number} subscription {old_tier} expired. Downgraded to SEED.")
            
    return f"Checked subscriptions. Downgraded {downgraded_count} users to SEED."


@shared_task(queue='payments')
def process_escrow_payout(escrow_transaction_id):
    """
    Background worker that process outbound payouts for released or refunded escrow transactions.
    - If status is RELEASED, disburse to the seller (farmer).
    - If status is REFUNDED, disburse to the buyer.
    """
    from apps.orders.models import EscrowTransaction, EscrowLog
    from apps.payments.models import PayoutTransaction
    from apps.payments.paynow_client import PaynowClient
    import uuid

    try:
        escrow = EscrowTransaction.objects.get(id=escrow_transaction_id)
    except EscrowTransaction.DoesNotExist:
        logger.error(f"EscrowTransaction #{escrow_transaction_id} not found.")
        return f"EscrowTransaction #{escrow_transaction_id} not found."

    order = escrow.order

    # Determine recipient and payout amount
    if escrow.status == 'RELEASED':
        recipient = order.seller
        # Payout the seller the actual crop value (net price)
        payout_amount = order.total_price_usd_cents
    elif escrow.status == 'REFUNDED':
        recipient = order.buyer
        # Refund the buyer the full amount they deposited
        payout_amount = escrow.amount_cents
    else:
        logger.warning(f"EscrowTransaction #{escrow_transaction_id} is in status {escrow.status}. Payout not applicable.")
        return f"EscrowTransaction status is {escrow.status}. No payout processed."

    # Get user's payout details
    payout_channel = recipient.payout_channel
    payout_destination = recipient.payout_destination

    # Fallback if payout details are not configured
    if not payout_destination:
        payout_channel = 'ecocash'
        payout_destination = recipient.phone_number
        logger.info(f"Recipient {recipient.phone_number} has not set payout details. Falling back to EcoCash mobile number.")

    # Create payout reference
    payout_ref = f"POUT-{uuid.uuid4().hex[:12].upper()}"

    with transaction.atomic():
        payout_tx = PayoutTransaction.objects.create(
            escrow_transaction=escrow,
            amount_cents=payout_amount,
            recipient=recipient,
            reference=payout_ref,
            status='PENDING'
        )

    # Call Paynow client to initiate outbound payout
    client = PaynowClient()
    authemail = client.return_url or "escrow@agrimarket.co.zw"  # Platform authority mail

    # Compile any bank-specific fields if channel is bank
    extra_fields = {}
    if payout_channel == 'bank':
        extra_fields = {
            'bank': recipient.payout_bank_name or 'CBZ Bank',
            'accountname': recipient.payout_account_name or (recipient.email or recipient.phone_number),
            'bankcode': '0000' # default bank code placeholder
        }

    response_data = client.initiate_payout(
        reference=payout_ref,
        amount_cents=payout_amount,
        destination=payout_destination,
        destination_type=payout_channel,
        authemail=authemail,
        extra_fields=extra_fields
    )

    if response_data.get('status', '').lower() == 'ok':
        with transaction.atomic():
            payout_tx.paynow_reference = response_data.get('paynowreference', '')
            payout_tx.status = 'SUCCESS'
            payout_tx.save()

            # Log to Escrow logs
            platform_earning = escrow.amount_cents - payout_amount
            notes_str = f"Outbound payout of {payout_amount} cents successfully completed to {recipient.phone_number} via {payout_channel}. Ref: {payout_ref}"
            if platform_earning > 0:
                notes_str += f" | Platform retained commission (developer revenue): {platform_earning} cents."
            
            EscrowLog.objects.create(
                escrow=escrow,
                actor=None,  # system process
                old_status=escrow.status,
                new_status=escrow.status,
                notes=notes_str
            )
        logger.info(f"Payout successful. Reference: {payout_ref}")
        return f"Payout SUCCESS: Ref {payout_ref}"
    else:
        error_msg = response_data.get('error', 'Unknown error during Paynow payout initiation.')
        with transaction.atomic():
            payout_tx.status = 'FAILED'
            payout_tx.error_message = error_msg
            payout_tx.save()

            EscrowLog.objects.create(
                escrow=escrow,
                actor=None,
                old_status=escrow.status,
                new_status=escrow.status,
                notes=f"Outbound payout FAILED for {recipient.phone_number} via {payout_channel}. Error: {error_msg}. Ref: {payout_ref}"
            )
        logger.error(f"Payout failed. Reference: {payout_ref}, Error: {error_msg}")
        return f"Payout FAILED: Ref {payout_ref}, Error: {error_msg}"


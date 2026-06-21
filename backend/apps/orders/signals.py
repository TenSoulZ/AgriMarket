from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.orders.models import EscrowTransaction
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=EscrowTransaction)
def escrow_status_notification(sender, instance, created, **kwargs):
    """
    Listens for any changes to an EscrowTransaction.
    Automatically dispatches internal system alerts or external SMS/Email
    hooks when funds are secured or released.
    """
    buyer_phone = instance.order.buyer.phone_number
    seller_phone = instance.order.seller.phone_number
    order_ref = f"AM-{instance.order.id}"
    amount = f"${instance.amount_cents / 100:.2f}"

    if created:
        logger.info(f"[PLATFORM NOTIFICATION] New Escrow initiated for {order_ref}.")
        return
        
    if instance.status == 'HELD':
        # Trigger when Buyer successfully pays into the Paynow gateway
        logger.info(
            f"[SMS DISPATCH] To {seller_phone} (Seller): "
            f"Funds ({amount}) for Order {order_ref} have been secured in AgriMarket Trust. "
            f"Please proceed to ship the cargo."
        )
    elif instance.status == 'RELEASED':
        # Trigger when Buyer inspects cargo and clicks Release
        logger.info(
            f"[SMS DISPATCH] To {seller_phone} (Seller): "
            f"Buyer ({buyer_phone}) has released the escrow for {order_ref}. "
            f"Payout of {amount} is en route to your registered account!"
        )
    elif instance.status == 'REFUNDED':
        # Trigger if dispute resolution returns funds to buyer
        logger.info(
            f"[SMS DISPATCH] To {buyer_phone} (Buyer): "
            f"Order {order_ref} has been cancelled. "
            f"Your escrow of {amount} has been refunded to your wallet."
        )

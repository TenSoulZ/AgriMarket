from celery import shared_task
from django.utils import timezone
from datetime import timedelta, date
import logging
from .models import ForwardContract

logger = logging.getLogger(__name__)

@shared_task(queue='contracts')
def check_forward_contract_reminders():
    """
    Daily task that sends delivery reminders (14 days and 3 days before delivery date)
    for forward contracts that have had their deposits paid.
    """
    today = date.today()
    reminder_days = [14, 3]

    for days in reminder_days:
        target_date = today + timedelta(days=days)
        contracts = ForwardContract.objects.filter(
            status='DEPOSIT_PAID',
            delivery_date=target_date
        )
        
        for contract in contracts:
            msg = (
                f"Reminder: Forward Contract #{contract.id} for {contract.qty_tonnes} tonnes "
                f"of {contract.commodity.name} is scheduled for delivery in {days} days on {contract.delivery_date}."
            )
            # In production, this would trigger an SMS and push notification
            logger.info(f"SMS SENT to Farmer ({contract.farmer.phone_number}) & Buyer ({contract.buyer.phone_number}): {msg}")
            print(f"FORWARD CONTRACT REMINDER: {msg}")


@shared_task(queue='contracts')
def cancel_unpaid_forward_contracts():
    """
    Hourly/Daily task that checks for forward contracts accepted by a buyer
    but where no deposit was paid within the required 48-hour window.
    These contracts are automatically cancelled.
    """
    threshold_time = timezone.now() - timedelta(hours=48)
    
    # Query accepted forward contracts without deposit paid past 48h limit
    unpaid_contracts = ForwardContract.objects.filter(
        status='ACCEPTED',
        accepted_at__lte=threshold_time
    )
    
    count = unpaid_contracts.count()
    if count > 0:
        for contract in unpaid_contracts:
            contract.cancel()
            contract.save()
            logger.info(f"Forward Contract #{contract.id} auto-cancelled: deposit not received within 48h.")
            print(f"FORWARD CONTRACT #{contract.id} AUTO-CANCELLED due to unpaid deposit.")
            
    return f"Processed {count} unpaid forward contracts."

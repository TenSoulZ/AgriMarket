from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging
from .models import EscrowTransaction, EscrowLog

logger = logging.getLogger(__name__)

@shared_task(queue='orders')
def auto_release_escrow():
    """
    Automated job to release held escrow payments to sellers after safety timeout windows:
    - Standard orders: 72 hours auto-release after being HELD.
    - Large orders ($1,000+): 7 days (168 hours) auto-release after being FULLY_HELD.
    """
    now = timezone.now()
    
    # 1. Standard orders timeout (72h)
    std_threshold = now - timedelta(hours=72)
    std_escrows = EscrowTransaction.objects.filter(
        status='HELD',
        order__is_large_order=False,
        updated_at__lte=std_threshold
    )
    
    std_count = std_escrows.count()
    for escrow in std_escrows:
        old_status = escrow.status
        escrow.release_payment()
        escrow.save()
        
        # Log transition as system action
        EscrowLog.objects.create(
            escrow=escrow,
            actor=None,
            old_status=old_status,
            new_status=escrow.status,
            ip_address="127.0.0.1",
            notes="Automated system release: 72h standard escrow window expired."
        )
        logger.info(f"Standard Escrow #{escrow.id} auto-released after 72h.")

    # 2. Large orders timeout (7 days / 168h)
    large_threshold = now - timedelta(days=7)
    large_escrows = EscrowTransaction.objects.filter(
        status='FULLY_HELD',
        order__is_large_order=True,
        updated_at__lte=large_threshold
    )
    
    large_count = large_escrows.count()
    for escrow in large_escrows:
        old_status = escrow.status
        escrow.release_payment()
        escrow.save()
        
        # Log transition
        EscrowLog.objects.create(
            escrow=escrow,
            actor=None,
            old_status=old_status,
            new_status=escrow.status,
            ip_address="127.0.0.1",
            notes="Automated system release: 7-day large order escrow window expired."
        )
        logger.info(f"Large Escrow #{escrow.id} auto-released after 7 days.")
        
    return f"Auto-released {std_count} standard and {large_count} large escrow transactions."

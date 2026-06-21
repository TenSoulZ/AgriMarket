import logging
from django.db import transaction
from celery import shared_task

from apps.logistics.models import LoadPost, LogisticsPool, PoolMembership
from apps.notifications.tasks import send_sms_notification

logger = logging.getLogger(__name__)

@shared_task
def pool_open_loads():
    """
    Celery task for pooling open posts by route (origin to destination).
    Groups them into LogisticsPools dynamically and calculates cost shares proportionally.
    """
    routes = LoadPost.objects.filter(status='OPEN').values('origin_district', 'destination_district').distinct()
    pools_updated = 0

    for route in routes:
        origin = route['origin_district']
        destination = route['destination_district']

        # Fetch open posts on this route ordered by date of post
        posts = list(LoadPost.objects.filter(
            origin_district=origin,
            destination_district=destination,
            status='OPEN'
        ).order_by('created_at'))

        if not posts:
            continue

        try:
            with transaction.atomic():
                # Find an OPEN pool for this route, or create one
                pool = LogisticsPool.objects.filter(
                    origin_district=origin,
                    destination_district=destination,
                    status='OPEN'
                ).first()

                if not pool:
                    pool = LogisticsPool.objects.create(
                        origin_district=origin,
                        destination_district=destination,
                        total_weight_kg=0,
                        status='OPEN'
                    )

                # Add new posts to the pool
                for p in posts:
                    PoolMembership.objects.create(
                        load_post=p,
                        logistics_pool=pool,
                        cost_share_cents=0
                    )
                    pool.total_weight_kg += p.weight_kg
                    p.status = 'POOLED'
                    p.save()

                pool.save()

                # Recalculate cost shares for ALL members in the pool based on new total weight
                total_cost_cents = 25000 + (pool.total_weight_kg * 5)
                memberships = PoolMembership.objects.filter(logistics_pool=pool)
                
                for membership in memberships:
                    ratio = membership.load_post.weight_kg / pool.total_weight_kg
                    share_cents = int(ratio * total_cost_cents)
                    membership.cost_share_cents = share_cents
                    membership.save()

                # Send SMS to the newly pooled posts
                for p in posts:
                    # Retrieve the updated cost share
                    membership = PoolMembership.objects.get(load_post=p)
                    share_cents = membership.cost_share_cents
                    sms_text = (
                        f"AgriMarket: Your load of {p.weight_kg}kg ({p.commodity.name}) "
                        f"has joined Pool #{pool.id} ({origin} to {destination}). "
                        f"Current route capacity: {pool.total_weight_kg}/5000kg. Est Cost: ${share_cents / 100:.2f} USD."
                    )
                    send_sms_notification.delay(p.creator.phone_number, sms_text)

                pools_updated += 1
                logger.info(f"LogisticsPool #{pool.id} updated successfully with {pool.total_weight_kg}kg total.")

        except Exception as e:
            logger.exception(f"Error occurred while updating logistics pool for route {origin}->{destination}: {str(e)}")

    return f"Periodic pooling run complete. Updated {pools_updated} pools."

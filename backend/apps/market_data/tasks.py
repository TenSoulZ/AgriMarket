import logging
from celery import shared_task
from apps.market_data.models import CommodityPrice, PriceAlert
from apps.notifications.tasks import send_sms_notification

logger = logging.getLogger(__name__)

@shared_task
def check_price_alerts_task(price_id):
    """
    Checks all untriggered PriceAlerts for a given CommodityPrice update.
    Triggers matching alerts and dispatches SMS notifications.
    """
    try:
        price = CommodityPrice.objects.get(id=price_id)
    except CommodityPrice.DoesNotExist:
        logger.error(f"CommodityPrice #{price_id} not found.")
        return "Price record not found"

    alerts = PriceAlert.objects.filter(
        commodity=price.commodity,
        is_triggered=False
    )

    triggered_count = 0
    for alert in alerts:
        # Verify district constraint
        if alert.district and alert.district.strip().lower() != price.district.strip().lower():
            continue

        trigger_alert = False
        if alert.alert_type == 'ABOVE' and price.price_per_tonne_usd_cents >= alert.target_price_usd_cents:
            trigger_alert = True
        elif alert.alert_type == 'BELOW' and price.price_per_tonne_usd_cents <= alert.target_price_usd_cents:
            trigger_alert = True

        if trigger_alert:
            alert.is_triggered = True
            alert.save()

            sms_text = (
                f"AgriMarket Price Alert: {price.commodity.name} in {price.district} "
                f"is recorded at ${price.price_per_tonne_usd_cents / 100:.2f}/tonne, "
                f"matching your target of ${alert.target_price_usd_cents / 100:.2f}/tonne ({alert.alert_type})."
            )
            send_sms_notification.delay(alert.user.phone_number, sms_text)
            triggered_count += 1

    return f"Processed alerts for price #{price_id}. Triggered {triggered_count} notifications."

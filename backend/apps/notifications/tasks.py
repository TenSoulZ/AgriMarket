import logging
from celery import shared_task
from decouple import config

logger = logging.getLogger(__name__)

@shared_task
def send_sms_notification(phone_number, message_text):
    """
    Sends an SMS notification using Africa's Talking API.
    If the API Key is not set, or sending fails, falls back to logging the SMS to the console.
    """
    username = config('AFRICAS_TALKING_USERNAME', default='sandbox')
    api_key = config('AFRICAS_TALKING_API_KEY', default='')

    logger.info(f"Initiating SMS to {phone_number}")

    if not api_key:
        logger.warning(f"SMS API key not configured. FALLBACK LOG: To: {phone_number} | Message: {message_text}")
        return "Logged to console (Fallback)"

    try:
        import africastalking
        africastalking.initialize(username, api_key)
        sms = africastalking.SMS
        response = sms.send(message_text, [phone_number])
        logger.info(f"SMS successfully sent via Africa's Talking: {response}")
        return response
    except Exception as e:
        logger.error(f"Africa's Talking SMS delivery failed: {str(e)}. Falling back to logger.")
        logger.warning(f"FALLBACK LOG (On Error): To: {phone_number} | Message: {message_text}")
        return "Logged to console after API failure"

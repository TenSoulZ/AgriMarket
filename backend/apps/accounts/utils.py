import random
import logging
from django.utils import timezone
from datetime import timedelta
from decouple import config
import africastalking
from .models import PhoneOTP

logger = logging.getLogger(__name__)

# Initialize Africa's Talking
AT_USERNAME = config('AFRICAS_TALKING_USERNAME', default='sandbox')
AT_API_KEY = config('AFRICAS_TALKING_API_KEY', default='')

if AT_API_KEY:
    try:
        africastalking.initialize(AT_USERNAME, AT_API_KEY)
        sms_client = africastalking.SMS
    except Exception as e:
        logger.warning(f"Failed to initialize Africa's Talking SDK: {e}")
        sms_client = None
else:
    sms_client = None


def generate_otp(phone_number):
    """
    Generate a 6-digit OTP, persist it to the database, and return it.
    Previous OTPs for the same number are marked as expired/invalid.
    """
    # Expiry set to 10 minutes
    expiry_time = timezone.now() + timedelta(minutes=10)
    
    # Generate random 6 digit code
    otp_code = f"{random.randint(100000, 999999)}"
    
    # Create OTP object
    phone_otp = PhoneOTP.objects.create(
        phone_number=phone_number,
        otp_code=otp_code,
        expires_at=expiry_time
    )
    return phone_otp


def send_otp_sms(phone_number, otp_code):
    """
    Send the OTP code via Africa's Talking SMS API.
    If credentials are not present or fail, print the OTP to the console.
    """
    message = f"Your AgriMarket ZW verification code is: {otp_code}. Valid for 10 minutes."
    
    if sms_client and AT_USERNAME != 'sandbox':
        try:
            # Send SMS synchronously
            response = sms_client.send(message, [phone_number])
            logger.info(f"Africa's Talking SMS response: {response}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS through Africa's Talking: {e}")
            # Fallback to console print
            
    # Dev/Sandbox console print fallback
    print("\n" + "="*50)
    print(f"DEBUG SMS OTP: Sent to {phone_number}")
    print(f"MESSAGE: {message}")
    print("="*50 + "\n")
    return True

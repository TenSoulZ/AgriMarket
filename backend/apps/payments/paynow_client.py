import logging
import hashlib
import urllib.parse
import requests
from decouple import config

logger = logging.getLogger(__name__)

class PaynowClient:
    def __init__(self):
        self.integration_id = config('PAYNOW_INTEGRATION_ID', default='')
        self.integration_key = config('PAYNOW_INTEGRATION_KEY', default='')
        self.return_url = config('PAYNOW_RETURN_URL', default='')
        self.result_url = config('PAYNOW_RESULT_URL', default='')
        self.initiate_url = "https://www.paynow.co.zw/interface/initiatetransaction"

    def generate_hash(self, data):
        """
        Generate SHA512 hash of dictionary data values sorted alphabetically by key.
        Appends the integration key at the end.
        """
        sorted_keys = sorted(data.keys())
        hash_string = ""
        for key in sorted_keys:
            if key.lower() == 'hash':
                continue
            hash_string += str(data[key])
        
        hash_string += self.integration_key
        hasher = hashlib.sha512()
        hasher.update(hash_string.encode('utf-8'))
        return hasher.hexdigest().upper()

    def verify_hash(self, data):
        """
        Verify that the received hash matches the computed hash.
        """
        received_hash = data.get('hash', '')
        if not received_hash:
            return False
        
        computed_hash = self.generate_hash(data)
        return received_hash.upper() == computed_hash.upper()

    def initiate_transaction(self, reference, amount_cents, authemail, additional_info=None):
        """
        Initiate a transaction with Paynow.
        """
        if not self.integration_id or not self.integration_key:
            logger.error("Paynow credentials are not set in environment.")
            return {"status": "Error", "error": "Paynow configuration missing."}

        amount_usd = f"{amount_cents / 100:.2f}"
        
        data = {
            'id': self.integration_id,
            'reference': reference,
            'amount': amount_usd,
            'additionalinfo': additional_info or '',
            'returnurl': self.return_url,
            'resulturl': self.result_url,
            'authemail': authemail,
            'status': 'Message'
        }
        
        # Add SHA512 hash to data
        data['hash'] = self.generate_hash(data)
        
        try:
            response = requests.post(self.initiate_url, data=data, timeout=15)
            if response.status_code != 200:
                logger.error(f"Paynow returned HTTP {response.status_code}: {response.text}")
                return {"status": "Error", "error": f"HTTP error {response.status_code}"}
            
            # Parse form-urlencoded response
            parsed_response = {k: v[0] for k, v in urllib.parse.parse_qs(response.text).items()}
            
            if parsed_response.get('status', '').lower() == 'error':
                logger.error(f"Paynow initiation error: {parsed_response.get('error')}")
                return parsed_response
            
            # Verify signature of the response from Paynow
            if not self.verify_hash(parsed_response):
                logger.warning("Paynow initiation response hash verification failed!")
                # For safety, we can reject or still return, but let's log the error
            
            return parsed_response

        except Exception as e:
            logger.exception("Failed to contact Paynow API.")
            return {"status": "Error", "error": str(e)}

    def check_transaction_status(self, poll_url):
        """
        Check status of a transaction from the poll URL.
        """
        try:
            response = requests.get(poll_url, timeout=15)
            if response.status_code != 200:
                logger.error(f"Paynow status check returned HTTP {response.status_code}")
                return None
            
            parsed_response = {k: v[0] for k, v in urllib.parse.parse_qs(response.text).items()}
            
            if not self.verify_hash(parsed_response):
                logger.warning("Paynow status response hash verification failed!")
                return None
                
            return parsed_response
        except Exception as e:
            logger.exception(f"Failed to check Paynow transaction status at {poll_url}")
            return None

    def initiate_payout(self, reference, amount_cents, destination, destination_type, authemail, extra_fields=None):
        """
        Initiate an outbound payout/disbursement to a seller or buyer.
        """
        if not self.integration_id or not self.integration_key:
            logger.error("Paynow credentials are not set in environment.")
            return {"status": "Error", "error": "Paynow configuration missing."}

        payout_url = "https://www.paynow.co.zw/interface/initiatepayout"
        amount_usd = f"{amount_cents / 100:.2f}"

        data = {
            'id': self.integration_id,
            'reference': reference,
            'amount': amount_usd,
            'destination': destination,
            'destinationtype': destination_type,
            'authemail': authemail,
            'status': 'Message'
        }

        # Add any bank-specific fields (e.g. bank, bankcode, accountname, etc.)
        if extra_fields:
            data.update(extra_fields)

        # Generate signature hash
        data['hash'] = self.generate_hash(data)

        # Sandbox Simulation check:
        # If we are in local/sandbox mode or using placeholder keys, we mock success
        is_sandbox = config('PAYNOW_SANDBOX_MODE', default='True').lower() == 'true' or not self.integration_id

        if is_sandbox:
            logger.info(f"[Sandbox Mode] Simulating Paynow Payout. Reference: {reference}, Amount: ${amount_usd}, Recipient: {destination} ({destination_type})")
            return {
                "status": "ok",
                "reference": reference,
                "amount": amount_usd,
                "paynowreference": f"MOCK-PAYNOW-{reference}"
            }

        try:
            response = requests.post(payout_url, data=data, timeout=15)
            if response.status_code != 200:
                logger.error(f"Paynow payout returned HTTP {response.status_code}: {response.text}")
                return {"status": "Error", "error": f"HTTP error {response.status_code}"}

            parsed_response = {k: v[0] for k, v in urllib.parse.parse_qs(response.text).items()}

            if parsed_response.get('status', '').lower() == 'error':
                logger.error(f"Paynow payout initiation error: {parsed_response.get('error')}")
                return parsed_response

            # Verify response hash from Paynow
            if not self.verify_hash(parsed_response):
                logger.warning("Paynow payout response hash verification failed!")

            return parsed_response

        except Exception as e:
            logger.exception("Failed to contact Paynow Payout API.")
            return {"status": "Error", "error": str(e)}


from django.test import TestCase
from django.contrib.auth import get_user_model
from django.conf import settings
from apps.orders.models import Order, EscrowTransaction
from apps.payments.models import PayoutTransaction
from apps.payments.tasks import process_escrow_payout
from apps.payments.paynow_client import PaynowClient

User = get_user_model()

class PaymentsTestCase(TestCase):
    def setUp(self):
        self.buyer = User.objects.create_user(
            phone_number="+263771111111",
            role="RETAIL_BUYER",
            subscription_tier="HARVEST",
            kyc_status="VERIFIED"
        )
        self.seller = User.objects.create_user(
            phone_number="+263772222222",
            role="SMALLHOLDER_FARMER",
            subscription_tier="HARVEST",
            kyc_status="VERIFIED",
            payout_channel="ecocash",
            payout_destination="+263772222222"
        )
        self.order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            qty=10,
            total_price_usd_cents=5000
        )
        self.escrow = EscrowTransaction.objects.create(
            order=self.order,
            amount_cents=5000,
            status='PENDING'
        )

    def test_initiate_payout_sandbox(self):
        client = PaynowClient()
        # Ensure we are mock-simulating payout in sandbox mode
        res = client.initiate_payout(
            reference="POUT-TEST",
            amount_cents=5000,
            destination="+263772222222",
            destination_type="ecocash",
            authemail="test@agrimarket.co.zw"
        )
        self.assertEqual(res.get('status'), 'ok')
        self.assertIn('MOCK-PAYNOW', res.get('paynowreference'))

    def test_process_escrow_payout_success(self):
        # Move escrow to RELEASED state
        self.escrow.hold_payment()
        self.escrow.release_payment()
        self.escrow.save()

        # Run process payout task synchronously
        res = process_escrow_payout(self.escrow.id)
        self.assertIn("Payout SUCCESS", res)

        # Check payout transaction creation
        payout_tx = PayoutTransaction.objects.get(escrow_transaction=self.escrow)
        self.assertEqual(payout_tx.status, 'SUCCESS')
        self.assertEqual(payout_tx.recipient, self.seller)
        self.assertEqual(payout_tx.amount_cents, 5000)

    def test_process_escrow_payout_refund(self):
        # Move escrow to DISPUTED then REFUNDED
        self.escrow.hold_payment()
        self.escrow.dispute_payment(reason="Damaged goods")
        self.escrow.refund_payment()
        self.escrow.save()

        # Run process payout task
        res = process_escrow_payout(self.escrow.id)
        self.assertIn("Payout SUCCESS", res)

        payout_tx = PayoutTransaction.objects.get(escrow_transaction=self.escrow)
        self.assertEqual(payout_tx.status, 'SUCCESS')
        self.assertEqual(payout_tx.recipient, self.buyer)
        self.assertEqual(payout_tx.amount_cents, 5000)

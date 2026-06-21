from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.contracts.models import RFQ, RFQQuote, BulkContract, ForwardContract
from apps.contracts.serializers import RFQQuoteSerializer
from apps.market_data.models import Commodity
from datetime import date

User = get_user_model()

class ContractsTestCase(TestCase):
    def setUp(self):
        self.commodity = Commodity.objects.create(name="Soya Beans", description="Bulk Soya Beans")
        
        # Create users
        self.commercial_buyer_with_tax = User.objects.create_user(
            phone_number="+263771111111",
            role="COMMERCIAL_BUYER",
            subscription_tier="COMMERCIAL",
            kyc_status="VERIFIED",
            is_commercially_approved=True,
            tax_clearance_doc="tax_docs/clearance.pdf"
        )
        self.commercial_buyer_no_tax = User.objects.create_user(
            phone_number="+263772222222",
            role="COMMERCIAL_BUYER",
            subscription_tier="COMMERCIAL",
            kyc_status="VERIFIED",
            is_commercially_approved=True
        )
        self.commercial_farmer = User.objects.create_user(
            phone_number="+263773333333",
            role="COMMERCIAL_FARMER",
            subscription_tier="COMMERCIAL",
            kyc_status="VERIFIED"
        )
        self.smallholder_farmer = User.objects.create_user(
            phone_number="+263774444444",
            role="SMALLHOLDER_FARMER",
            subscription_tier="HARVEST",
            kyc_status="VERIFIED"
        )

    class MockRequest:
        def __init__(self, user):
            self.user = user

    def test_smallholder_farmer_cannot_quote(self):
        rfq = RFQ.objects.create(
            buyer=self.commercial_buyer_with_tax,
            commodity=self.commodity,
            qty_tonnes=10.0,
            quality_spec="Grade A",
            delivery_district="Harare",
            deadline=date.today()
        )
        
        context = {'request': self.MockRequest(self.smallholder_farmer)}
        data = {
            'rfq': rfq.id,
            'price_per_tonne_usd_cents': 38000,
            'qty_tonnes': 10.0,
            'availability_date': date.today()
        }
        
        serializer = RFQQuoteSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("Only Commercial Farmers", str(serializer.errors['non_field_errors']))

    def test_tax_clearance_document_requirement(self):
        # Create a contract with value > $5,000 USD
        # Total value = 15 tonnes * $400/tonne = $6,000 USD (600,000 cents)
        contract_large = BulkContract.objects.create(
            farmer=self.commercial_farmer,
            buyer=self.commercial_buyer_no_tax,
            commodity=self.commodity,
            total_qty_tonnes=15.0,
            price_per_tonne_usd_cents=40000, # $400.00
            terms_text="Test Terms"
        )
        
        # Attempt to transition to DEPOSIT_PAID
        with self.assertRaises(ValueError) as context:
            contract_large.pay_deposit()
        self.assertIn("Tax clearance document is required", str(context.exception))
        
        # Update buyer with tax document and retry
        contract_large.buyer = self.commercial_buyer_with_tax
        contract_large.pay_deposit()
        self.assertEqual(contract_large.status, "DEPOSIT_PAID")

    def test_forward_contract_transitions(self):
        forward = ForwardContract.objects.create(
            farmer=self.commercial_farmer,
            commodity=self.commodity,
            qty_tonnes=5.0,
            delivery_date=date.today(),
            fixed_price_per_tonne_usd_cents=36000
        )
        
        self.assertEqual(forward.status, "DRAFT")
        forward.publish()
        self.assertEqual(forward.status, "PUBLISHED")
        
        forward.accept(buyer=self.commercial_buyer_with_tax)
        self.assertEqual(forward.status, "ACCEPTED")
        self.assertEqual(forward.buyer, self.commercial_buyer_with_tax)
        self.assertIsNotNone(forward.accepted_at)

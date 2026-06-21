from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.listings.models import Category, Listing
from apps.orders.models import Order, EscrowTransaction, EscrowLog
from apps.orders.serializers import OrderSerializer
from rest_framework import serializers

User = get_user_model()

class OrdersTestCase(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Horticulture", description="Vegetables")
        
        # Create users
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
            kyc_status="VERIFIED"
        )
        
        # Create listing
        self.listing = Listing.objects.create(
            farmer=self.seller,
            title="Fresh Cabbages",
            description="Freshly harvested cabbages",
            category=self.category,
            price_per_kg_usd_cents=50, # 50c
            quantity_available_kg=200.0,
            location_province="HARARE",
            location_district="Harare Central"
        )

    class MockRequest:
        def __init__(self, user):
            self.user = user

    def test_self_ordering_block(self):
        # Seller tries to buy their own cabbages
        self.seller.role = "RETAIL_BUYER"
        self.seller.save()
        context = {'request': self.MockRequest(self.seller)}
        data = {
            'listing': self.listing.id,
            'qty': 10.0,
            'total_price_usd_cents': 500
        }
        
        serializer = OrderSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("cannot place an order on your own listing", str(serializer.errors['non_field_errors']))

    def test_large_order_auto_flag(self):
        # Create an order worth $1,200 USD (120,000 cents)
        order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            listing=self.listing,
            qty=2400.0,
            total_price_usd_cents=120000
        )
        
        self.assertTrue(order.is_large_order)

    def test_escrow_transaction_creation_and_dispute(self):
        # Place standard order
        order = Order.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            listing=self.listing,
            qty=100.0,
            total_price_usd_cents=5000 # $50.00
        )
        
        # Create escrow transaction
        escrow = EscrowTransaction.objects.create(
            order=order,
            amount_cents=5000,
            status='PENDING'
        )
        
        self.assertEqual(escrow.status, 'PENDING')
        
        # Simulate payment confirmation
        escrow.hold_payment()
        self.assertEqual(escrow.status, 'HELD')
        
        # Buyer raises a dispute
        escrow.dispute_payment(reason="Cabbages were rotten on delivery.")
        self.assertEqual(escrow.status, 'DISPUTED')
        self.assertEqual(escrow.dispute_reason, "Cabbages were rotten on delivery.")

    def test_bulk_order_tax_clearance_vetting(self):
        # Create a Commodity
        from apps.market_data.models import Commodity
        commodity = Commodity.objects.create(
            name="Soybeans",
            description="Soybeans commodity"
        )

        # Create a wholesale listing
        from apps.listings.models import WholesaleListing
        import datetime
        wholesale_listing = WholesaleListing.objects.create(
            farmer=self.seller,
            commodity=commodity,
            title="Bulk Soybeans",
            category=self.category,
            price_per_tonne_usd_cents=40000,
            quantity_available_tonnes=20,
            min_order_quantity_tonnes=1,
            quality_grade='A',
            moisture_content_pct=11.5,
            harvest_date=datetime.date.today()
        )
        
        # Buyer tries to buy bulk soybeans worth $6,000 USD (600,000 cents) without tax clearance doc
        context = {'request': self.MockRequest(self.buyer)}
        data = {
            'wholesale_listing': wholesale_listing.id,
            'qty': 15.0,
            'total_price_usd_cents': 600000
        }
        
        serializer = OrderSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("verified tax clearance document", str(serializer.errors['non_field_errors'][0]))

        # Now mock the tax clearance document on the buyer profile and check validity
        self.buyer.tax_clearance_doc = "kyc/tax_docs/itf263.pdf"
        self.buyer.save()

        serializer = OrderSerializer(data=data, context=context)
        self.assertTrue(serializer.is_valid())


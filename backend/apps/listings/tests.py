from django.test import TestCase
from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.listings.models import Category, Listing, WholesaleListing
from apps.listings.serializers import ListingSerializer, WholesaleListingSerializer
from apps.market_data.models import Commodity
from datetime import date

User = get_user_model()

class ListingsTestCase(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Grains", description="Cereal grains")
        self.commodity = Commodity.objects.create(name="Maize", description="White Maize")
        
        # Create different test users
        self.verified_seed_user = User.objects.create_user(
            phone_number="+263771111111",
            role="SMALLHOLDER_FARMER",
            subscription_tier="SEED",
            kyc_status="VERIFIED"
        )
        self.unverified_seed_user = User.objects.create_user(
            phone_number="+263772222222",
            role="SMALLHOLDER_FARMER",
            subscription_tier="SEED",
            kyc_status="UNVERIFIED"
        )
        self.commercial_user = User.objects.create_user(
            phone_number="+263773333333",
            role="COMMERCIAL_FARMER",
            subscription_tier="COMMERCIAL",
            kyc_status="VERIFIED"
        )

    class MockRequest:
        def __init__(self, user):
            self.user = user

    def test_unverified_user_cannot_list(self):
        # Setup mock request context for serializer validation
        context = {'request': self.MockRequest(self.unverified_seed_user)}
        data = {
            'title': 'Test Beans',
            'description': 'Beans for sale',
            'category': self.category.id,
            'price_per_kg_usd_cents': 150,
            'quantity_available_kg': 100.0,
            'location_province': 'HARARE',
            'location_district': 'Harare Central'
        }
        
        serializer = ListingSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("You must complete KYC verification", str(serializer.errors['non_field_errors']))

    def test_seed_tier_limit(self):
        context = {'request': self.MockRequest(self.verified_seed_user)}
        
        # Create 3 active listings
        for i in range(3):
            Listing.objects.create(
                farmer=self.verified_seed_user,
                title=f'Beans {i}',
                description='Fresh beans',
                category=self.category,
                price_per_kg_usd_cents=150,
                quantity_available_kg=50.0,
                location_province='HARARE',
                location_district='Harare'
            )
            
        data = {
            'title': 'Beans 4',
            'description': 'Excess beans',
            'category': self.category.id,
            'price_per_kg_usd_cents': 150,
            'quantity_available_kg': 100.0,
            'location_province': 'HARARE',
            'location_district': 'Harare'
        }
        
        serializer = ListingSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn("limited to a maximum of 3 active listings", str(serializer.errors['non_field_errors']))

    def test_wholesale_min_quantity_limit(self):
        context = {'request': self.MockRequest(self.commercial_user)}
        data = {
            'commodity': self.commodity.id,
            'title': 'Bulk Maize',
            'description': 'Maize bulk order',
            'category': self.category.id,
            'price_per_tonne_usd_cents': 35000,
            'quantity_available_tonnes': 5.0,
            'min_order_quantity_tonnes': 0.5,  # Invalid: less than 1.0 tonne
            'quality_grade': 'A',
            'moisture_content_pct': 12.5,
            'harvest_date': date.today()
        }
        
        serializer = WholesaleListingSerializer(data=data, context=context)
        self.assertFalse(serializer.is_valid())
        self.assertIn('min_order_quantity_tonnes', serializer.errors)

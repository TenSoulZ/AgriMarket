from django.test import TestCase
from django.utils import timezone
from apps.accounts.models import User, FarmProfile, PhoneOTP
from apps.accounts.utils import generate_otp
from apps.market_data.models import Commodity

class AccountsTestCase(TestCase):
    def setUp(self):
        self.commodity = Commodity.objects.create(name="Maize", description="White Maize")

    def test_phone_number_normalization(self):
        # normalize_phone transforms local formats '077...' to '+26377...'
        user = User.objects.create_user(phone_number="0771234567", role="SMALLHOLDER_FARMER")
        self.assertEqual(user.phone_number, "+263771234567")

    def test_user_creation_with_farm_profile(self):
        user = User.objects.create_user(phone_number="+263771234567", role="SMALLHOLDER_FARMER")
        farm = FarmProfile.objects.create(
            user=user, 
            farm_name="Chinhoyi Farm", 
            farm_size_hectares=12.5, 
            irrigation_type="DRIP"
        )
        farm.primary_commodities.add(self.commodity)
        
        self.assertEqual(user.farm_profile.farm_name, "Chinhoyi Farm")
        self.assertEqual(user.farm_profile.farm_size_hectares, 12.5)
        self.assertEqual(user.farm_profile.primary_commodities.first(), self.commodity)

    def test_otp_generation_and_expiry(self):
        otp = generate_otp("+263771234567")
        self.assertEqual(len(otp.otp_code), 6)
        self.assertTrue(otp.expires_at > timezone.now())
        self.assertFalse(otp.is_verified)
        
        # Verify it persisted to DB
        db_otp = PhoneOTP.objects.get(phone_number="+263771234567")
        self.assertEqual(db_otp.otp_code, otp.otp_code)

    def test_admin_kyc_verification(self):
        from django.urls import reverse
        from rest_framework.test import APIClient
        from rest_framework import status

        # Create normal user and admin user
        normal_user = User.objects.create_user(phone_number="+263772222222", role="SMALLHOLDER_FARMER")
        admin_user = User.objects.create_superuser(phone_number="+263773333333", password="adminpassword")

        # Clients
        normal_client = APIClient()
        normal_client.force_authenticate(user=normal_user)

        admin_client = APIClient()
        admin_client.force_authenticate(user=admin_user)

        # 1. Non-admin should be blocked from list
        url_list = reverse('admin-user-list')
        response = normal_client.get(url_list)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Admin should access list
        response = admin_client.get(url_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # 3. Non-admin should be blocked from verification patch
        url_verify = reverse('admin-user-verify', kwargs={'user_id': normal_user.id})
        response = normal_client.patch(url_verify, {'kyc_status': 'VERIFIED', 'is_commercially_approved': True})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


        # 4. Admin should be able to verify
        response = admin_client.patch(url_verify, {'kyc_status': 'VERIFIED', 'is_commercially_approved': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify changes in DB
        normal_user.refresh_from_db()
        self.assertEqual(normal_user.kyc_status, 'VERIFIED')
        self.assertTrue(normal_user.is_commercially_approved)


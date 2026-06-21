import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.accounts.models import User, FarmProfile

def create_users():
    # 1. Superuser / Admin
    if not User.objects.filter(phone_number='+263771111111').exists():
        User.objects.create_superuser(
            phone_number='+263771111111',
            password='Password123!',
        )
        print("Superuser (+263771111111) created.")
    else:
        print("Superuser (+263771111111) already exists.")
        
    # 2. Commercial Farmer
    if not User.objects.filter(phone_number='+263772222222').exists():
        farmer = User.objects.create_user(
            phone_number='+263772222222',
            password='Password123!',
            role='COMMERCIAL_FARMER',
            subscription_tier='COMMERCIAL',
            kyc_status='VERIFIED'
        )
        try:
            FarmProfile.objects.create(
                user=farmer,
                farm_name='Test Commercial Farm',
                farm_size_hectares=500.0,
                farming_methods='Mechanized'
            )
        except Exception as e:
            print("Farm Profile creation skipped/failed:", e)
        print("Commercial Farmer (+263772222222) created.")
    else:
        print("Commercial Farmer (+263772222222) already exists.")

    # 3. Commercial Buyer
    if not User.objects.filter(phone_number='+263773333333').exists():
        User.objects.create_user(
            phone_number='+263773333333',
            password='Password123!',
            role='COMMERCIAL_BUYER',
            subscription_tier='ENTERPRISE',
            kyc_status='VERIFIED'
        )
        print("Commercial Buyer (+263773333333) created.")
    else:
        print("Commercial Buyer (+263773333333) already exists.")
        
    # 4. Transporter
    if not User.objects.filter(phone_number='+263774444444').exists():
        User.objects.create_user(
            phone_number='+263774444444',
            password='Password123!',
            role='TRANSPORTER',
            subscription_tier='HARVEST',
            kyc_status='VERIFIED'
        )
        print("Transporter (+263774444444) created.")
    else:
        print("Transporter (+263774444444) already exists.")

if __name__ == '__main__':
    create_users()

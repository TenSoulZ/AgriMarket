import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.conf import settings
settings.CELERY_TASK_ALWAYS_EAGER = True

from apps.accounts.models import User, FarmProfile, CommercialBuyerProfile
from apps.market_data.models import Commodity, CommodityPrice
from apps.listings.models import WholesaleListing, Category
from unittest.mock import patch

def create_users():
    users_data = [
        {"phone": "+263772000001", "role": "COMMERCIAL_FARMER", "name": "Tendai Makoni (Farmer)"},
        {"phone": "+263772000002", "role": "COMMERCIAL_BUYER", "name": "ZimAgri Buyers Hub"},
        {"phone": "+263772000003", "role": "TRANSPORTER", "name": "Swift Logistics ZW"},
    ]
    
    created_users = []
    for u in users_data:
        user, created = User.objects.get_or_create(
            phone_number=u['phone'],
            defaults={
                'role': u['role'], 
                'is_active': True, 
                'kyc_status': 'VERIFIED',
                'province': 'HARARE',
                'district': 'Harare',
                'subscription_tier': 'COMMERCIAL'
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            
            if u['role'] == 'COMMERCIAL_FARMER':
                FarmProfile.objects.get_or_create(user=user, defaults={'farm_name': u['name'], 'farm_size_hectares': 100, 'irrigation_type': 'DRIP'})
            elif u['role'] == 'COMMERCIAL_BUYER':
                CommercialBuyerProfile.objects.get_or_create(user=user, defaults={'company_name': u['name'], 'buyer_type': 'SUPERMARKET'})
                
            print(f"[+] Created User: {u['role']} ({u['phone']})")
        created_users.append(user)
    return created_users

def seed_database():
    print("========================================")
    print("AGRIMARKET MASTER SEED PROTOCOL INITIATED")
    print("========================================")
    
    print("\n--- Seeding Realistic Users ---")
    users = create_users()
    farmer = next(u for u in users if u.role == 'COMMERCIAL_FARMER')
    
    print("\n--- Booting Catalog Seeding Script ---")
    from seed_commodities import seed_commodities
    seed_commodities()
    
    commodities = list(Commodity.objects.all())
    if not commodities:
        print("Fatal Error: No commodities generated.")
        return
        
    print("\n--- Seeding Historical Price Feeds (Realistic Curves) ---")
    districts = ['Harare', 'Bulawayo', 'Mutare', 'Gweru']
    
    # Accurate baseline prices per tonne (in cents) for ZW market
    realistic_prices = {
        'White Maize': 33000,          # $330/t
        'Sorghum': 35000,              # $350/t
        'Winter Wheat': 45000,         # $450/t
        'Soya Beans': 55000,           # $550/t
        'Sugar Beans': 120000,         # $1,200/t
        'Groundnuts (Shelled)': 140000,# $1,400/t
        'Macadamia Nuts': 350000,      # $3,500/t
        'Potatoes (Table)': 45000,     # $450/t
        'Tomatoes': 50000,             # $500/t
        'Flue-Cured Tobacco': 300000,  # $3,000/t ($3/kg)
        'Seed Cotton': 80000           # $800/t ($0.80/kg)
    }

    for comm in commodities:
        base_price = realistic_prices.get(comm.name, 40000)
        
        # Generate a stable 7-day price trend (gentle fluctuations)
        current_trend = base_price
        for i in range(7, -1, -1):
            date = datetime.now().date() - timedelta(days=i)
            # +/- 2% daily fluctuation instead of wild jumps
            current_trend = int(current_trend * random.uniform(0.98, 1.02))
            
            CommodityPrice.objects.get_or_create(
                commodity=comm,
                district=random.choice(districts),
                recorded_date=date,
                defaults={'price_per_tonne_usd_cents': current_trend}
            )
    print(f"[+] Generated stable historical price curves for {len(commodities)} commodities.")

    print("\n--- Generating Premium Market Listings ---")
    cat_grains, _ = Category.objects.get_or_create(name="Bulk Grains", defaults={'description': 'Commercial grain volume.'})
    cat_hort, _ = Category.objects.get_or_create(name="Horticulture", defaults={'description': 'Fresh produce.'})
    cat_cash, _ = Category.objects.get_or_create(name="Cash Crops", defaults={'description': 'Export and processing crops.'})
    
    for comm in commodities:
        # Determine category mapping
        listing_cat = cat_grains
        if comm.category == 'HORTICULTURE':
            listing_cat = cat_hort
        elif comm.category == 'OTHER':
            listing_cat = cat_cash
            
        base_price = realistic_prices.get(comm.name, 40000)
        listing_price = int(base_price * random.uniform(0.95, 1.05)) # Farmer asks slightly above/below market
        
        listing, created = WholesaleListing.objects.get_or_create(
            farmer=farmer,
            commodity=comm,
            title=f"Premium Grade A {comm.name} - Direct from Farm",
            defaults={
                'description': f"High-quality {comm.name} harvested this season. Moisture content strictly tested and verified. Ready for immediate commercial dispatch.",
                'category': listing_cat,
                'quantity_available_tonnes': round(random.uniform(10.0, 100.0), 2),
                'price_per_tonne_usd_cents': listing_price,
                'quality_grade': random.choice(['A', 'A', 'B']), # Skew towards high quality
                'moisture_content_pct': round(random.uniform(10.5, 13.5), 2),
                'harvest_date': datetime.now().date() - timedelta(days=random.randint(5, 30)),
                'is_active': True
            }
        )
        if created:
            print(f"[+] Generated Listing: {listing.title} at ${listing_price/100:,.2f}/t")

    print("\n========================================")
    print("REALISTIC SEED PROTOCOL COMPLETE")
    print("========================================")

if __name__ == '__main__':
    with patch('apps.market_data.tasks.check_price_alerts_task.delay'):
        seed_database()

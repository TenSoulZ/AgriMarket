import os
import django
import random
from datetime import datetime, timedelta
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.conf import settings
settings.CELERY_TASK_ALWAYS_EAGER = True

from apps.accounts.models import User, FarmProfile, CommercialBuyerProfile
from apps.market_data.models import Commodity, CommodityPrice
from apps.listings.models import Listing, WholesaleListing, Category
from apps.contracts.models import RFQ, RFQQuote, BulkContract, ForwardContract
from apps.logistics.models import Transporter, LoadPost, LogisticsPool, PoolMembership, FleetBooking
from unittest.mock import patch

def create_users():
    users_data = [
        {"phone": "+263772000001", "role": "COMMERCIAL_FARMER", "name": "Tendai Makoni (Farmer)", "district": "Marondera", "province": "MASHONALAND_EAST"},
        {"phone": "+263772000002", "role": "COMMERCIAL_BUYER", "name": "ZimAgri Buyers Hub", "district": "Harare", "province": "HARARE"},
        {"phone": "+263772000003", "role": "TRANSPORTER", "name": "Swift Logistics ZW", "district": "Bulawayo", "province": "BULAWAYO"},
        {"phone": "+263772000004", "role": "SMALLHOLDER_FARMER", "name": "Chipo Moyo (Farmer)", "district": "Gokwe South", "province": "MIDLANDS"},
        {"phone": "+263772000005", "role": "RETAIL_BUYER", "name": "Harare Fresh Foods", "district": "Harare", "province": "HARARE"},
    ]
    
    created_users = []
    for u in users_data:
        user, created = User.objects.get_or_create(
            phone_number=u['phone'],
            defaults={
                'role': u['role'], 
                'is_active': True, 
                'kyc_status': 'VERIFIED',
                'province': u['province'],
                'district': u['district'],
                'subscription_tier': 'COMMERCIAL' if 'COMMERCIAL' in u['role'] else 'HARVEST'
            }
        )
        if created:
            user.set_password('password123')
            user.save()
            
        if 'FARMER' in u['role']:
            FarmProfile.objects.get_or_create(user=user, defaults={'farm_name': u['name'], 'farm_size_hectares': 45 if 'SMALLHOLDER' in u['role'] else 150, 'irrigation_type': 'DRIP'})
        elif 'BUYER' in u['role']:
            CommercialBuyerProfile.objects.get_or_create(user=user, defaults={'company_name': u['name'], 'buyer_type': 'SUPERMARKET' if 'COMMERCIAL' in u['role'] else 'RETAILER'})
        elif u['role'] == 'TRANSPORTER':
            Transporter.objects.get_or_create(
                user=user, 
                defaults={
                    'company_name': u['name'],
                    'vehicle_type': '30-Tonne Link Truck',
                    'vehicle_capacity_kg': 30000,
                    'license_number': 'TRANS-992-ZW',
                    'is_verified': True,
                    'rating': 4.8
                }
            )
            
        print(f"[+] Created/Verified User: {u['role']} ({u['phone']})")
        created_users.append(user)
    return created_users

def seed_database():
    print("========================================")
    print("AGRIMARKET PRODUCTION-READY SEEDING PROTOCOL")
    print("========================================")
    
    print("\n[1] Seeding Realistic Users...")
    users = create_users()
    farmer_comm = next(u for u in users if u.role == 'COMMERCIAL_FARMER')
    farmer_small = next(u for u in users if u.role == 'SMALLHOLDER_FARMER')
    buyer_comm = next(u for u in users if u.role == 'COMMERCIAL_BUYER')
    buyer_retail = next(u for u in users if u.role == 'RETAIL_BUYER')
    transporter_user = next(u for u in users if u.role == 'TRANSPORTER')
    transporter = Transporter.objects.get(user=transporter_user)
    
    print("\n[2] Seeding Commodities Catalog...")
    from seed_commodities import seed_commodities
    seed_commodities()
    
    commodities = list(Commodity.objects.all())
    if not commodities:
        print("Fatal Error: No commodities generated.")
        return
        
    print("\n[3] Seeding 7-Day Price Trends...")
    districts = ['Harare', 'Bulawayo', 'Mutare', 'Gweru']
    realistic_prices = {
        'White Maize': 33000,
        'Sorghum': 35000,
        'Winter Wheat': 45000,
        'Soya Beans': 55000,
        'Sugar Beans': 120000,
        'Groundnuts (Shelled)': 140000,
        'Macadamia Nuts': 350000,
        'Potatoes (Table)': 45000,
        'Tomatoes': 50000,
        'Flue-Cured Tobacco': 300000,
        'Seed Cotton': 80000
    }

    for comm in commodities:
        base_price = realistic_prices.get(comm.name, 40000)
        current_trend = base_price
        for i in range(7, -1, -1):
            date = datetime.now().date() - timedelta(days=i)
            current_trend = int(current_trend * random.uniform(0.98, 1.02))
            CommodityPrice.objects.get_or_create(
                commodity=comm,
                district=random.choice(districts),
                recorded_date=date,
                defaults={'price_per_tonne_usd_cents': current_trend}
            )
    print(f"[+] Generated price curves for {len(commodities)} commodities.")

    print("\n[4] Seeding Marketplace Categories & Listings...")
    cat_grains, _ = Category.objects.get_or_create(name="Bulk Grains", defaults={'description': 'Commercial grain volume.'})
    cat_hort, _ = Category.objects.get_or_create(name="Horticulture", defaults={'description': 'Fresh produce.'})
    cat_cash, _ = Category.objects.get_or_create(name="Cash Crops", defaults={'description': 'Export and processing crops.'})
    
    # Wholesale Listings
    for comm in commodities:
        listing_cat = cat_grains
        if comm.category == 'HORTICULTURE':
            listing_cat = cat_hort
        elif comm.category == 'OTHER':
            listing_cat = cat_cash
            
        base_price = realistic_prices.get(comm.name, 40000)
        listing_price = int(base_price * random.uniform(0.95, 1.05))
        
        WholesaleListing.objects.get_or_create(
            farmer=farmer_comm,
            commodity=comm,
            title=f"Premium Grade A {comm.name} - Direct from Farm",
            defaults={
                'description': f"High-quality {comm.name} harvested this season. Moisture content strictly tested and verified. Ready for immediate commercial dispatch.",
                'category': listing_cat,
                'quantity_available_tonnes': round(random.uniform(10.0, 100.0), 2),
                'price_per_tonne_usd_cents': listing_price,
                'quality_grade': random.choice(['A', 'A', 'B']),
                'moisture_content_pct': round(random.uniform(10.5, 13.5), 2),
                'harvest_date': datetime.now().date() - timedelta(days=random.randint(5, 30)),
                'is_active': True
            }
        )
    
    # Retail Listings
    retail_crops = [
        ("Potatoes (Table)", 45, 500, cat_hort),
        ("Tomatoes", 55, 300, cat_hort),
        ("Sugar Beans", 120, 400, cat_grains),
    ]
    for name, price_per_kg, qty_kg, cat in retail_crops:
        Listing.objects.get_or_create(
            farmer=farmer_small,
            title=f"Freshly Harvested {name}",
            defaults={
                'description': f"Best quality local {name} grown naturally in Gokwe. Ready for immediate collection.",
                'category': cat,
                'price_per_kg_usd_cents': price_per_kg,
                'quantity_available_kg': qty_kg,
                'location_province': 'MIDLANDS',
                'location_district': 'Gokwe South',
                'is_active': True
            }
        )
    print("[+] Generated retail and wholesale listings.")

    print("\n[5] Seeding Contracts & RFQs...")
    comm_maize = Commodity.objects.get(name="White Maize")
    comm_beans = Commodity.objects.get(name="Sugar Beans")
    comm_soya = Commodity.objects.get(name="Soya Beans")
    comm_wheat = Commodity.objects.get(name="Winter Wheat")
    comm_cotton = Commodity.objects.get(name="Seed Cotton")

    # RFQ 1: Open for Maize
    rfq_maize, _ = RFQ.objects.get_or_create(
        buyer=buyer_comm,
        commodity=comm_maize,
        qty_tonnes=50.00,
        defaults={
            'quality_spec': "Moisture < 12.5%, Grade A premium white maize.",
            'delivery_district': "Harare",
            'deadline': timezone.now() + timedelta(days=5),
            'status': 'PUBLISHED'
        }
    )
    
    # Quotes for Maize RFQ
    RFQQuote.objects.get_or_create(
        rfq=rfq_maize,
        farmer=farmer_comm,
        defaults={
            'price_per_tonne_usd_cents': 32000,
            'qty_tonnes': 50.00,
            'availability_date': datetime.now().date() + timedelta(days=2),
            'notes': "Available for direct dispatch from Marondera.",
            'is_accepted': False
        }
    )
    RFQQuote.objects.get_or_create(
        rfq=rfq_maize,
        farmer=farmer_small,
        defaults={
            'price_per_tonne_usd_cents': 31000,
            'qty_tonnes': 30.00,
            'availability_date': datetime.now().date() + timedelta(days=3),
            'notes': "Can transport to Harare GMB or direct depot.",
            'is_accepted': False
        }
    )

    # RFQ 2: Open for Sugar Beans
    RFQ.objects.get_or_create(
        buyer=buyer_retail,
        commodity=comm_beans,
        qty_tonnes=15.00,
        defaults={
            'quality_spec': "Speckled sugar beans, dry and clean.",
            'delivery_district': "Harare",
            'deadline': timezone.now() + timedelta(days=10),
            'status': 'PUBLISHED'
        }
    )

    # Bulk Contract 1: In Fulfilment
    rfq_soya, _ = RFQ.objects.get_or_create(
        buyer=buyer_comm,
        commodity=comm_soya,
        qty_tonnes=30.00,
        defaults={
            'quality_spec': "Soybeans for oil milling.",
            'delivery_district': "Harare",
            'deadline': timezone.now() - timedelta(days=2),
            'status': 'AWARDED'
        }
    )
    quote_soya, _ = RFQQuote.objects.get_or_create(
        rfq=rfq_soya,
        farmer=farmer_comm,
        defaults={
            'price_per_tonne_usd_cents': 54000,
            'qty_tonnes': 30.00,
            'availability_date': datetime.now().date() - timedelta(days=1),
            'notes': "Moisture verified.",
            'is_accepted': True
        }
    )
    
    BulkContract.objects.get_or_create(
        rfq=rfq_soya,
        winning_quote=quote_soya,
        farmer=farmer_comm,
        buyer=buyer_comm,
        commodity=comm_soya,
        total_qty_tonnes=30.00,
        price_per_tonne_usd_cents=54000,
        defaults={
            'status': 'IN_FULFILMENT',
            'terms_text': "Standard 2.5% escrow holds. Retainage released upon physical inspection and GMB weight certificate validation."
        }
    )

    # Forward Contracts
    ForwardContract.objects.get_or_create(
        farmer=farmer_comm,
        commodity=comm_wheat,
        qty_tonnes=40.00,
        delivery_date=datetime.now().date() + timedelta(days=90),
        fixed_price_per_tonne_usd_cents=44000,
        defaults={
            'deposit_pct': 20.00,
            'status': 'PUBLISHED'
        }
    )
    
    ForwardContract.objects.get_or_create(
        farmer=farmer_small,
        buyer=buyer_comm,
        commodity=comm_cotton,
        qty_tonnes=15.00,
        delivery_date=datetime.now().date() + timedelta(days=60),
        fixed_price_per_tonne_usd_cents=78000,
        defaults={
            'deposit_pct': 20.00,
            'status': 'ACCEPTED',
            'accepted_at': timezone.now()
        }
    )
    print("[+] Generated RFQs, quotes, bulk contracts, and forward agreements.")

    print("\n[6] Seeding Logistics Pooling...")
    # Load Posts
    load_maize, _ = LoadPost.objects.get_or_create(
        creator=farmer_small,
        commodity=comm_maize,
        weight_kg=5000,
        origin_district="Gokwe South",
        destination_district="Harare",
        defaults={
            'target_pickup_date': datetime.now().date() + timedelta(days=4),
            'status': 'POOLING'
        }
    )
    load_beans, _ = LoadPost.objects.get_or_create(
        creator=farmer_small,
        commodity=comm_beans,
        weight_kg=3000,
        origin_district="Gokwe South",
        destination_district="Harare",
        defaults={
            'target_pickup_date': datetime.now().date() + timedelta(days=4),
            'status': 'POOLING'
        }
    )
    LoadPost.objects.get_or_create(
        creator=farmer_comm,
        commodity=comm_soya,
        weight_kg=12000,
        origin_district="Marondera",
        destination_district="Harare",
        defaults={
            'target_pickup_date': datetime.now().date() + timedelta(days=2),
            'status': 'OPEN'
        }
    )

    # Logistics Pool
    pool_gokwe, _ = LogisticsPool.objects.get_or_create(
        origin_district="Gokwe South",
        destination_district="Harare",
        defaults={
            'total_weight_kg': 8000,
            'status': 'OPEN'
        }
    )
    
    # Pool Memberships
    PoolMembership.objects.get_or_create(
        load_post=load_maize,
        logistics_pool=pool_gokwe,
        defaults={'cost_share_cents': 12000} # $120.00 share
    )
    PoolMembership.objects.get_or_create(
        load_post=load_beans,
        logistics_pool=pool_gokwe,
        defaults={'cost_share_cents': 8000} # $80.00 share
    )

    # Fleet Booking
    FleetBooking.objects.get_or_create(
        transporter=transporter,
        logistics_pool=pool_gokwe,
        booked_by=farmer_small,
        defaults={
            'status': 'CONFIRMED',
            'agreed_cost_cents': 20000, # $200.00 total transport cost
            'booking_date': datetime.now().date() + timedelta(days=4)
        }
    )
    print("[+] Generated loads, pools, memberships, and transporter bookings.")

    print("\n========================================")
    print("MASTER PRODUCTION SEED SUCCESSFUL")
    print("========================================")

if __name__ == '__main__':
    with patch('apps.market_data.tasks.check_price_alerts_task.delay'):
        seed_database()

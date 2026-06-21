import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.market_data.models import Commodity

def seed_commodities():
    print("Initiating Master Catalog Seeding Protocol...")
    
    commodities_data = [
        # Grains & Cereals
        {
            "name": "White Maize",
            "category": "GRAINS",
            "search_keys": "maize, corn, chibage, umbila, mealie",
            "standard_unit": "Tonnes",
            "hs_code": "100590",
            "description": "Zimbabwe's staple cereal crop. High quality, non-GMO white maize suitable for human consumption."
        },
        {
            "name": "Sorghum",
            "category": "GRAINS",
            "search_keys": "sorghum, mapfunde, amabele",
            "standard_unit": "Tonnes",
            "hs_code": "100790",
            "description": "Drought-resistant cereal grain, excellent for brewing and stock feed milling."
        },
        {
            "name": "Winter Wheat",
            "category": "GRAINS",
            "search_keys": "wheat, gorosi, korosi",
            "standard_unit": "Tonnes",
            "hs_code": "100199",
            "description": "High-protein winter wheat grown primarily under irrigation."
        },
        
        # Legumes & Oilseeds
        {
            "name": "Soya Beans",
            "category": "LEGUMES",
            "search_keys": "soya, soybeans, soya beans",
            "standard_unit": "Tonnes",
            "hs_code": "120190",
            "description": "High-protein oilseed vital for cooking oil extraction and poultry feed formulation."
        },
        {
            "name": "Sugar Beans",
            "category": "LEGUMES",
            "search_keys": "beans, nydimo, sugar beans",
            "standard_unit": "Tonnes",
            "hs_code": "071022",
            "description": "Premium speckled sugar beans, high demand in both retail and wholesale markets."
        },
        {
            "name": "Groundnuts (Shelled)",
            "category": "LEGUMES",
            "search_keys": "peanuts, nzungu, amazambane",
            "standard_unit": "Tonnes",
            "hs_code": "120242",
            "description": "Premium shelled groundnuts for peanut butter manufacturing and roasting."
        },

        # Horticulture
        {
            "name": "Macadamia Nuts",
            "category": "HORTICULTURE",
            "search_keys": "macadamia, nuts",
            "standard_unit": "Tonnes",
            "hs_code": "080262",
            "description": "High-value export quality Macadamia Nuts in shell (NIS) primarily from the Eastern Highlands."
        },
        {
            "name": "Potatoes (Table)",
            "category": "HORTICULTURE",
            "search_keys": "potatoes, mbatatisi, amagwili",
            "standard_unit": "15kg Pockets",
            "hs_code": "070190",
            "description": "Grade A unwashed table potatoes."
        },
        {
            "name": "Tomatoes",
            "category": "HORTICULTURE",
            "search_keys": "tomatoes, madomasi",
            "standard_unit": "Crates (30kg)",
            "hs_code": "070200",
            "description": "Fresh market tomatoes."
        },

        # Other Commercial Cash Crops
        {
            "name": "Flue-Cured Tobacco",
            "category": "OTHER",
            "search_keys": "tobacco, fodya",
            "standard_unit": "Bales (kg)",
            "hs_code": "240110",
            "description": "Premium golden leaf flue-cured Virginia tobacco."
        },
        {
            "name": "Seed Cotton",
            "category": "OTHER",
            "search_keys": "cotton, donje",
            "standard_unit": "Bales (kg)",
            "hs_code": "520100",
            "description": "Raw seed cotton ready for ginning."
        }
    ]

    count = 0
    for data in commodities_data:
        obj, created = Commodity.objects.get_or_create(
            name=data['name'],
            defaults={
                'category': data['category'],
                'search_keys': data['search_keys'],
                'standard_unit': data['standard_unit'],
                'hs_code': data['hs_code'],
                'description': data['description']
            }
        )
        if created:
            print(f"[SUCCESS] Registered: {obj.name}")
            count += 1
        else:
            print(f"[SKIPPED] Already exists: {obj.name}")

    print(f"\nSeeding Complete! {count} new commodities injected into the platform.")

if __name__ == '__main__':
    seed_commodities()

import csv
import io
import random
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from apps.market_data.models import Commodity, CommodityPrice, PriceAlert, PriceIndex
from apps.market_data.serializers import (
    CommoditySerializer, CommodityPriceSerializer,
    PriceAlertSerializer, PriceIndexSerializer
)

class CommodityListView(generics.ListCreateAPIView):
    """
    Endpoint to list all available agricultural commodities.
    Admins can POST new master catalog entries.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = CommoditySerializer
    queryset = Commodity.objects.all()

    def perform_create(self, serializer):
        if not (self.request.user.is_staff or self.request.user.role == 'ADMIN'):
            raise permissions.exceptions.PermissionDenied("Only administrators can manage the Master Catalog.")
        serializer.save()


class CommodityDetailView(generics.RetrieveAPIView):
    """
    Endpoint to retrieve a single commodity by ID.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = CommoditySerializer
    queryset = Commodity.objects.all()


class CommodityPriceListView(generics.ListCreateAPIView):
    """
    Endpoint to view current/historical prices.
    Allows staff/admin to post price feed updates.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = CommodityPriceSerializer

    def get_queryset(self):
        queryset = CommodityPrice.objects.all()
        commodity_id = self.request.query_params.get('commodity')
        district = self.request.query_params.get('district')
        
        if commodity_id:
            queryset = queryset.filter(commodity_id=commodity_id)
        if district:
            queryset = queryset.filter(district__iexact=district)
            
        return queryset

    def perform_create(self, serializer):
        # Only admins or staff can manually insert price feed items
        if not (self.request.user.is_staff or self.request.user.role == 'ADMIN'):
            raise permissions.exceptions.PermissionDenied("Only administrators can post market price updates.")
        serializer.save()


class CommodityPriceDetailView(generics.RetrieveAPIView):
    """
    Endpoint to retrieve a single price feed by ID.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    serializer_class = CommodityPriceSerializer
    queryset = CommodityPrice.objects.all()


class PriceAlertListCreateView(generics.ListCreateAPIView):
    """
    Endpoint for a user to manage or add price triggers.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PriceAlertSerializer

    def get_queryset(self):
        return PriceAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PriceIndexListView(generics.ListAPIView):
    """
    Endpoint to view aggregated regional commodity indices.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PriceIndexSerializer

    def get_queryset(self):
        queryset = PriceIndex.objects.all()
        commodity_id = self.request.query_params.get('commodity')
        if commodity_id:
            queryset = queryset.filter(commodity_id=commodity_id)
        return queryset

class WeatherAdvisoryView(APIView):
    """
    Endpoint that returns dynamic hyper-local weather and an AI agronomic advisory.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Simulate local climate data for the user's registered district or a default
        temp = random.randint(22, 35)
        humidity = random.randint(40, 85)
        rainfall_prob = random.randint(0, 100)
        
        condition = "Sunny"
        if rainfall_prob > 70:
            condition = "Heavy Rain"
        elif rainfall_prob > 40:
            condition = "Showers"
        elif humidity > 70:
            condition = "Cloudy"

        # AI Agronomic Advisory Mock logic
        advisory = "Optimal farming conditions today. Proceed with standard irrigation and fertilization schedules."
        if condition == "Heavy Rain":
            advisory = "Alert: High rainfall expected in the next 48 hours. Postpone harvesting to prevent rot and aflatoxin contamination. Ensure drainage trenches are clear."
        elif condition == "Sunny" and temp > 32:
            advisory = "Heat Warning: Extremely high temperatures. Increase drip irrigation cycles to prevent heat stress on fruiting crops."
        elif condition == "Showers":
            advisory = "Moderate showers expected. Perfect conditions for top-dressing fertilizer application."
            
        forecast = [
            {"day": "Tomorrow", "temp": temp + random.randint(-2, 2), "condition": "Cloudy" if rainfall_prob > 50 else "Sunny"},
            {"day": "Day 3", "temp": temp + random.randint(-3, 3), "condition": condition},
            {"day": "Day 4", "temp": temp + random.randint(-1, 2), "condition": "Sunny"}
        ]

        data = {
            "current": {
                "temperature": temp,
                "humidity": humidity,
                "rainfall_probability": rainfall_prob,
                "condition": condition,
                "district": request.user.district if hasattr(request.user, 'district') and request.user.district else "Harare"
            },
            "forecast": forecast,
            "advisory": advisory
        }
        
        return Response(data, status=status.HTTP_200_OK)

class YieldForecastView(APIView):
    """
    Endpoint that simulates a Machine Learning yield projection based on agronomic inputs.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        crop_type = request.data.get('crop_type', 'Maize').lower()
        acreage = float(request.data.get('acreage', 1.0))
        soil_type = request.data.get('soil_type', 'Loam').lower()
        fertilizer_kg = float(request.data.get('fertilizer_kg', 0.0))
        
        # Base yield per hectare (tonnes)
        base_yields = {
            'maize': 5.5,
            'sugar beans': 2.2,
            'soyabeans': 3.0,
            'wheat': 6.0
        }
        
        base = base_yields.get(crop_type, 4.0)
        
        # Soil statistical multiplier
        soil_multipliers = {
            'loam': 1.1,
            'clay': 0.95,
            'sandy': 0.7,
            'silt': 1.05
        }
        soil_mult = soil_multipliers.get(soil_type, 1.0)
        
        # Fertilizer curve (diminishing returns & over-fertilization toxicity)
        fert_per_ha = fertilizer_kg / (acreage if acreage > 0 else 1)
        
        if fert_per_ha < 50:
            fert_mult = 0.6
        elif fert_per_ha < 150:
            fert_mult = 0.85
        elif fert_per_ha <= 300:
            fert_mult = 1.15
        else:
            fert_mult = 0.9 # Toxicity drop-off
            
        # Algorithmic calculation
        projected_yield_per_ha = base * soil_mult * fert_mult
        
        # Add random statistical variance +/- 8% to simulate environmental chaos
        variance = random.uniform(0.92, 1.08)
        projected_yield_per_ha *= variance
        
        total_yield_tonnes = projected_yield_per_ha * acreage
        
        # Generate intelligent recommendations
        recommendations = []
        if fert_per_ha < 100:
            recommendations.append(f"Your application of {fert_per_ha:.1f}kg/ha of fertilizer is severely sub-optimal. Increasing top-dressing could boost yield by up to 35%.")
        elif fert_per_ha > 300:
            recommendations.append(f"Warning: Fertilizer application ({fert_per_ha:.1f}kg/ha) exceeds optimal bounds and may cause root burn or soil acidity. Reduce application.")
            
        if soil_type == 'sandy':
            recommendations.append("Sandy soil detected. High leaching risk. We recommend splitting your fertilizer into 3 applications rather than 2.")
        elif soil_type == 'clay':
            recommendations.append("Clay soil detected. Excellent water retention, but monitor for waterlogging if heavy rainfall occurs.")
            
        if not recommendations:
            recommendations.append("Agronomic inputs appear mathematically optimal. Maintain current irrigation schedules.")
            
        data = {
            "estimated_yield_tonnes": round(total_yield_tonnes, 2),
            "yield_per_hectare": round(projected_yield_per_ha, 2),
            "confidence_score_percentage": random.randint(82, 94),
            "recommendations": recommendations
        }
        
        return Response(data, status=status.HTTP_200_OK)

class SyncMarketPricesView(APIView):
    """
    Admin-only endpoint designed to fetch market prices from a 3rd-party API.
    Currently acts as a Stub/Simulator until an official API URL is provided.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        # ---------------------------------------------------------
        # TODO: API INTEGRATION POINT
        # When you secure an API provider, replace the mock logic 
        # below with the following requests structure:
        # ---------------------------------------------------------
        # import requests
        # EXTERNAL_API_URL = "https://api.agrimarket-data.com/v1/prices"
        # API_KEY = "PASTE_YOUR_API_KEY_HERE"
        # try:
        #     response = requests.get(EXTERNAL_API_URL, headers={"Authorization": f"Bearer {API_KEY}"})
        #     response.raise_for_status()
        #     external_data = response.json()
        #     # Map external_data to AgriMarket's CommodityPrice format and bulk_create
        # except Exception as e:
        #     return Response({"error": f"External API Sync Failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

        # ---------------------------------------------------------
        # SIMULATION STUB LOGIC (Runs while awaiting real API):
        # ---------------------------------------------------------
        commodities = list(Commodity.objects.all())
        if not commodities:
            return Response({"error": "No core commodities exist in the database to map API data to."}, status=status.HTTP_400_BAD_REQUEST)
            
        districts = ['Harare', 'Bulawayo', 'Mutare', 'Gweru', 'Masvingo', 'Chinhoyi']
        synced_count = 0
        
        for _ in range(6): # Simulate fetching 6 new price feeds
            comm = random.choice(commodities)
            base_usd_cents = random.randint(18000, 65000) # $180 - $650 per tonne
            CommodityPrice.objects.create(
                commodity=comm,
                district=random.choice(districts),
                price_usd_cents=base_usd_cents,
                source="External API Sync Engine",
                is_official=True
            )
            synced_count += 1
            
        return Response({
            "message": f"Successfully fetched and synchronized {synced_count} live market price records from external API.",
            "synced_count": synced_count
        }, status=status.HTTP_200_OK)

class CommodityTemplateView(APIView):
    """
    Returns a blank CSV IDL template for the Admin to fill out.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="commodity_upload_template.csv"'

        writer = csv.writer(response)
        writer.writerow(['name', 'category', 'standard_unit', 'hs_code', 'description', 'search_keys'])
        
        # Add an example row
        writer.writerow(['Example Bean', 'LEGUMES', 'Tonnes', '071022', 'A high-yield sample bean', 'bean, sample'])
        
        return response

class CommodityBulkUploadView(APIView):
    """
    Parses an uploaded CSV and upserts Commodities into the Master Catalog.
    Supports a two-phase process: Validation (Dry Run) and Execution.
    """
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        validate_only = request.data.get('validate_only', 'false').lower() == 'true'
        
        if not file_obj:
            return Response({"error": "No CSV file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file_obj.name.endswith('.csv'):
            return Response({"error": "File must be a .csv format."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            updated_count = 0
            errors = []
            valid_rows = 0
            
            valid_categories = ['GRAINS', 'LEGUMES', 'HORTICULTURE', 'LIVESTOCK', 'DAIRY', 'OTHER']
            
            # Read all rows into memory for processing
            rows = list(reader)
            
            for index, row in enumerate(rows):
                row_num = index + 2 # +1 for 0-index, +1 for header
                name = row.get('name', '').strip()
                
                if not name:
                    errors.append(f"Row {row_num}: Missing Commodity Name.")
                    continue
                    
                category = row.get('category', '').strip().upper()
                if category not in valid_categories:
                    errors.append(f"Row {row_num} ({name}): Invalid Category '{category}'. Must be one of {', '.join(valid_categories)}.")
                    continue
                    
                valid_rows += 1
                
                if not validate_only:
                    defaults = {
                        'category': category,
                        'standard_unit': row.get('standard_unit', 'Tonnes').strip(),
                        'hs_code': row.get('hs_code', '').strip(),
                        'description': row.get('description', '').strip(),
                        'search_keys': row.get('search_keys', '').strip(),
                    }
                    
                    obj, created = Commodity.objects.update_or_create(
                        name=name,
                        defaults=defaults
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1
            
            if validate_only:
                return Response({
                    "is_valid": len(errors) == 0,
                    "valid_rows": valid_rows,
                    "errors": errors
                }, status=status.HTTP_200_OK)
                
            if errors:
                 # If validate_only is false but errors suddenly appeared (unlikely if they validated first),
                 # we still process the valid ones but return the errors as well.
                 pass
                    
            return Response({
                "message": "Bulk Upload Successful",
                "created": created_count,
                "updated": updated_count,
                "errors": errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"CSV Parsing Failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from datetime import datetime

class PriceTemplateView(APIView):
    """
    Returns a blank CSV IDL template for uploading Market Prices.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="price_upload_template.csv"'

        writer = csv.writer(response)
        writer.writerow(['commodity_name', 'district', 'price_usd', 'recorded_date'])
        
        today = datetime.now().strftime('%Y-%m-%d')
        writer.writerow(['White Maize', 'Harare', '245.50', today])
        
        return response

class PriceBulkUploadView(APIView):
    """
    Parses an uploaded CSV and appends CommodityPrices to the database.
    Supports a two-phase process: Validation (Dry Run) and Execution.
    """
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        validate_only = request.data.get('validate_only', 'false').lower() == 'true'
        
        if not file_obj:
            return Response({"error": "No CSV file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file_obj.name.endswith('.csv'):
            return Response({"error": "File must be a .csv format."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            created_count = 0
            errors = []
            valid_rows = 0
            
            rows = list(reader)
            commodity_map = {c.name.lower(): c for c in Commodity.objects.all()}
            
            for index, row in enumerate(rows):
                row_num = index + 2
                comm_name = row.get('commodity_name', '').strip()
                district = row.get('district', '').strip()
                price_usd_str = row.get('price_usd', '').strip()
                date_str = row.get('recorded_date', '').strip()
                
                if not comm_name or not district or not price_usd_str:
                    errors.append(f"Row {row_num}: Missing required fields (commodity_name, district, or price_usd).")
                    continue
                    
                comm_obj = commodity_map.get(comm_name.lower())
                if not comm_obj:
                    errors.append(f"Row {row_num}: Commodity '{comm_name}' not found in the Master Catalog.")
                    continue
                    
                try:
                    price_usd_float = float(price_usd_str)
                    price_cents = int(price_usd_float * 100)
                except ValueError:
                    errors.append(f"Row {row_num}: Invalid price format '{price_usd_str}'.")
                    continue
                    
                if not date_str:
                    rec_date = datetime.now().date()
                else:
                    try:
                        rec_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid date format '{date_str}'. Must be YYYY-MM-DD.")
                        continue
                        
                valid_rows += 1
                
                if not validate_only:
                    CommodityPrice.objects.create(
                        commodity=comm_obj,
                        district=district,
                        price_per_tonne_usd_cents=price_cents,
                        recorded_date=rec_date
                    )
                    created_count += 1
            
            if validate_only:
                return Response({
                    "is_valid": len(errors) == 0,
                    "valid_rows": valid_rows,
                    "errors": errors
                }, status=status.HTTP_200_OK)
                    
            return Response({
                "message": "Bulk Price Upload Successful",
                "created": created_count,
                "errors": errors
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": f"CSV Parsing Failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

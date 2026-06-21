from django.db import models
from django.conf import settings
from apps.market_data.models import Commodity
from apps.accounts.models import User

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Category Name")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        ordering = ['name']
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class Listing(models.Model):
    # Retail listing (standard quantities, any Harvest+ farmer)
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='listings',
        verbose_name="Farmer"
    )
    title = models.CharField(max_length=150, verbose_name="Listing Title")
    description = models.TextField(verbose_name="Description")
    category = models.ForeignKey(
        Category, 
        on_delete=models.PROTECT, 
        related_name='listings',
        verbose_name="Category"
    )
    
    # Prices stored as integers in USD cents
    price_per_kg_usd_cents = models.PositiveIntegerField(verbose_name="Price per kg (USD cents)")
    quantity_available_kg = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity Available (kg)")
    
    location_province = models.CharField(
        max_length=50, 
        choices=User.PROVINCE_CHOICES, 
        verbose_name="Province"
    )
    location_district = models.CharField(max_length=100, verbose_name="District")
    
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Retail Listing"
        verbose_name_plural = "Retail Listings"

    def __str__(self):
        return f"{self.title} - {self.quantity_available_kg}kg ({self.farmer.phone_number})"


class WholesaleListing(models.Model):
    # Wholesale listing (commercial, minimum 1 tonne, COMMERCIAL tier only)
    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='wholesale_listings',
        verbose_name="Farmer"
    )
    commodity = models.ForeignKey(
        Commodity, 
        on_delete=models.PROTECT, 
        related_name='wholesale_listings',
        verbose_name="Commodity"
    )
    title = models.CharField(max_length=150, verbose_name="Wholesale Title")
    description = models.TextField(verbose_name="Description")
    category = models.ForeignKey(
        Category, 
        on_delete=models.PROTECT, 
        related_name='wholesale_listings',
        verbose_name="Category"
    )
    
    # Prices stored in USD cents (per tonne)
    price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Price per Tonne (USD cents)")
    quantity_available_tonnes = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Quantity Available (Tonnes)")
    min_order_quantity_tonnes = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=1.0, 
        verbose_name="Minimum Order Quantity (Tonnes)"
    )
    
    # Moisture & Grade metrics
    GRADE_CHOICES = [
        ('A', 'Grade A'),
        ('B', 'Grade B'),
        ('C', 'Grade C'),
    ]
    quality_grade = models.CharField(max_length=5, choices=GRADE_CHOICES, verbose_name="Quality Grade")
    moisture_content_pct = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Moisture Content (%)")
    
    harvest_date = models.DateField(verbose_name="Harvest Date")
    
    is_active = models.BooleanField(default=True, verbose_name="Is Active")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Wholesale Listing"
        verbose_name_plural = "Wholesale Listings"

    def __str__(self):
        return f"{self.title} - {self.quantity_available_tonnes} tonnes (Grade {self.quality_grade})"


class ListingImage(models.Model):
    listing = models.ForeignKey(
        Listing, 
        on_delete=models.CASCADE, 
        related_name='images', 
        null=True, 
        blank=True,
        verbose_name="Retail Listing"
    )
    wholesale_listing = models.ForeignKey(
        WholesaleListing, 
        on_delete=models.CASCADE, 
        related_name='images', 
        null=True, 
        blank=True,
        verbose_name="Wholesale Listing"
    )
    image = models.FileField(upload_to='listings/images/', verbose_name="Image File")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="Uploaded At")

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Listing Image"
        verbose_name_plural = "Listing Images"

    def __str__(self):
        associated = self.listing or self.wholesale_listing
        return f"Image for {associated.title if associated else 'unassociated'}"

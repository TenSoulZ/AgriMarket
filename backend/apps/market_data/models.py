from django.db import models
from django.conf import settings

class Commodity(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name="Commodity Name")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # --- PIM Enterprise Extensions ---
    category = models.CharField(
        max_length=50, 
        choices=[
            ('GRAINS', 'Grains & Cereals'),
            ('LEGUMES', 'Legumes & Oilseeds'),
            ('HORTICULTURE', 'Horticulture (Fruits & Veg)'),
            ('LIVESTOCK', 'Livestock & Meat'),
            ('DAIRY', 'Dairy Products'),
            ('OTHER', 'Other Commercial')
        ],
        default='GRAINS',
        verbose_name="Taxonomy Category"
    )
    search_keys = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Comma-separated synonyms (e.g., maize, corn, chibage, umbila)"
    )
    standard_unit = models.CharField(
        max_length=20, 
        default='Tonnes', 
        help_text="Standard trade metric (e.g., Tonnes, Kilograms, Bales, Head)"
    )
    hs_code = models.CharField(
        max_length=20, 
        blank=True, 
        help_text="Harmonized System Code for international trade / exports"
    )
    is_active = models.BooleanField(
        default=True, 
        help_text="Disable to temporarily pause trading of this commodity platform-wide."
    )

    class Meta:
        ordering = ['name']
        verbose_name = "Commodity"
        verbose_name_plural = "Commodities"

    def __str__(self):
        return self.name


class CommodityPrice(models.Model):
    commodity = models.ForeignKey(
        Commodity,
        on_delete=models.CASCADE,
        related_name='prices',
        verbose_name="Commodity"
    )
    district = models.CharField(max_length=100, verbose_name="District / Market")
    price_per_tonne_usd_cents = models.PositiveIntegerField(verbose_name="Price per Tonne (USD cents)")
    recorded_date = models.DateField(verbose_name="Recorded Date")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-recorded_date', 'commodity']
        verbose_name = "Commodity Price"
        verbose_name_plural = "Commodity Prices"

    def __str__(self):
        return f"{self.commodity.name} ({self.district}) - ${self.price_per_tonne_usd_cents / 100:.2f}/t on {self.recorded_date}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            # Inline alert checking logic
            from apps.market_data.tasks import check_price_alerts_task
            check_price_alerts_task.delay(self.id)


class PriceAlert(models.Model):
    ALERT_TYPE_CHOICES = [
        ('ABOVE', 'Trigger Above Target'),
        ('BELOW', 'Trigger Below Target'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='price_alerts',
        verbose_name="User"
    )
    commodity = models.ForeignKey(
        Commodity,
        on_delete=models.CASCADE,
        related_name='price_alerts',
        verbose_name="Commodity"
    )
    district = models.CharField(max_length=100, blank=True, verbose_name="District / Market")
    target_price_usd_cents = models.PositiveIntegerField(verbose_name="Target Price per Tonne (USD cents)")
    alert_type = models.CharField(max_length=10, choices=ALERT_TYPE_CHOICES, verbose_name="Alert Type")
    is_triggered = models.BooleanField(default=False, verbose_name="Is Triggered")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Price Alert"
        verbose_name_plural = "Price Alerts"

    def __str__(self):
        district_str = f" in {self.district}" if self.district else ""
        return f"Alert for {self.user.phone_number}: {self.commodity.name}{district_str} {self.alert_type} ${self.target_price_usd_cents / 100:.2f}"


class PriceIndex(models.Model):
    commodity = models.ForeignKey(
        Commodity,
        on_delete=models.CASCADE,
        related_name='indices',
        verbose_name="Commodity"
    )
    average_price_usd_cents = models.PositiveIntegerField(verbose_name="Average Price per Tonne (USD cents)")
    volume_tonnes = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, verbose_name="Aggregated Volume (Tonnes)")
    calculated_date = models.DateField(verbose_name="Calculated Date")

    class Meta:
        ordering = ['-calculated_date', 'commodity']
        verbose_name = "Price Index"
        verbose_name_plural = "Price Indices"

    def __str__(self):
        return f"Index for {self.commodity.name} on {self.calculated_date}: ${self.average_price_usd_cents / 100:.2f}"

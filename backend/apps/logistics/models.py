from django.db import models
from django.conf import settings
from apps.market_data.models import Commodity

class Transporter(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transporter_profile',
        verbose_name="User"
    )
    company_name = models.CharField(max_length=150, verbose_name="Company/Trading Name")
    vehicle_type = models.CharField(max_length=100, verbose_name="Vehicle Type (e.g. 10-Tonne Truck)")
    vehicle_capacity_kg = models.PositiveIntegerField(verbose_name="Vehicle Capacity (kg)")
    license_number = models.CharField(max_length=50, verbose_name="Operator License Number")
    is_verified = models.BooleanField(default=False, verbose_name="Is Verified")
    rating = models.FloatField(default=5.0, verbose_name="Rating")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        ordering = ['-rating', 'company_name']
        verbose_name = "Transporter"
        verbose_name_plural = "Transporters"

    def __str__(self):
        return f"{self.company_name} ({self.user.phone_number})"


class LoadPost(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open for Pooling'),
        ('POOLING', 'Pooling In Progress'),
        ('POOLED', 'Pooled'),
        ('CANCELLED', 'Cancelled'),
    ]

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='load_posts',
        verbose_name="Creator"
    )
    commodity = models.ForeignKey(
        Commodity,
        on_delete=models.PROTECT,
        related_name='load_posts',
        verbose_name="Commodity"
    )
    weight_kg = models.PositiveIntegerField(verbose_name="Weight (kg)")
    origin_district = models.CharField(max_length=100, verbose_name="Origin District")
    destination_district = models.CharField(max_length=100, verbose_name="Destination District")
    target_pickup_date = models.DateField(verbose_name="Target Pickup Date")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN', verbose_name="Status")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Load Post"
        verbose_name_plural = "Load Posts"

    def __str__(self):
        return f"Load #{self.id} - {self.weight_kg}kg {self.commodity.name} ({self.origin_district} -> {self.destination_district})"


class LogisticsPool(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open for Bookings'),
        ('BOOKED', 'Booked'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]

    origin_district = models.CharField(max_length=100, verbose_name="Origin District")
    destination_district = models.CharField(max_length=100, verbose_name="Destination District")
    total_weight_kg = models.PositiveIntegerField(verbose_name="Total Weight (kg)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN', verbose_name="Status")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Logistics Pool"
        verbose_name_plural = "Logistics Pools"

    def __str__(self):
        return f"Pool #{self.id} ({self.origin_district} -> {self.destination_district}) - {self.total_weight_kg}kg"


class PoolMembership(models.Model):
    load_post = models.OneToOneField(
        LoadPost,
        on_delete=models.CASCADE,
        related_name='pool_membership',
        verbose_name="Load Post"
    )
    logistics_pool = models.ForeignKey(
        LogisticsPool,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name="Logistics Pool"
    )
    cost_share_cents = models.PositiveIntegerField(verbose_name="Cost Share (USD cents)")
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Joined At")

    class Meta:
        ordering = ['-joined_at']
        verbose_name = "Pool Membership"
        verbose_name_plural = "Pool Memberships"

    def __str__(self):
        return f"Post #{self.load_post.id} in Pool #{self.logistics_pool.id} (Share: {self.cost_share_cents} cents)"


class FleetBooking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending Transporter Acceptance'),
        ('CONFIRMED', 'Confirmed'),
        ('IN_TRANSIT', 'In Transit'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    transporter = models.ForeignKey(
        Transporter,
        on_delete=models.CASCADE,
        related_name='bookings',
        verbose_name="Transporter"
    )
    logistics_pool = models.ForeignKey(
        LogisticsPool,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name="Logistics Pool"
    )
    load_post = models.ForeignKey(
        LoadPost,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='bookings',
        verbose_name="Single Load Post"
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='fleet_bookings',
        verbose_name="Booked By"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', verbose_name="Booking Status")
    agreed_cost_cents = models.PositiveIntegerField(verbose_name="Agreed Cost (USD cents)")
    booking_date = models.DateField(verbose_name="Scheduled Transport Date")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Fleet Booking"
        verbose_name_plural = "Fleet Bookings"

    def __str__(self):
        target = f"Pool #{self.logistics_pool.id}" if self.logistics_pool else f"Load #{self.load_post.id}"
        return f"Booking #{self.id} for {target} with {self.transporter.company_name} ({self.status})"

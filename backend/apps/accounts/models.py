from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import RegexValidator
from apps.market_data.models import Commodity

# Phone number validator for Zimbabwe format
# Support Econet (+263 77X / 78X), NetOne (+263 71X), Telecel (+263 73X)
# For testing and convenience, we permit standard international format or local representation.
phone_regex = RegexValidator(
    regex=r'^\+263(77|78|71|73)\d{7}$',
    message="Phone number must be entered in the format: '+263771234567'. Up to 12 digits allowed."
)

class UserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('The Phone Number must be set')
        phone_number = self.normalize_phone(phone_number)
        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('kyc_status', 'VERIFIED')
        extra_fields.setdefault('subscription_tier', 'COMMERCIAL')

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(phone_number, password, **extra_fields)

    def normalize_phone(self, phone_number):
        cleaned = phone_number.strip().replace(" ", "")
        if cleaned.startswith('0'):
            cleaned = '+263' + cleaned[1:]
        return cleaned

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('SMALLHOLDER_FARMER', 'Smallholder Farmer'),
        ('COMMERCIAL_FARMER', 'Commercial Farmer'),
        ('RETAIL_BUYER', 'Retail Buyer'),
        ('COMMERCIAL_BUYER', 'Commercial Buyer'),
        ('TRANSPORTER', 'Transporter'),
        ('ADMIN', 'Platform Admin'),
    ]

    SUB_TIER_CHOICES = [
        ('SEED', 'Seed Tier (Free)'),
        ('HARVEST', 'Harvest Tier ($5/month)'),
        ('ENTERPRISE', 'Enterprise Tier ($25/month)'),
        ('COMMERCIAL', 'Commercial Tier ($80/month)'),
    ]

    KYC_STATUS_CHOICES = [
        ('UNVERIFIED', 'Unverified'),
        ('PENDING', 'Pending Review'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]

    PROVINCE_CHOICES = [
        ('HARARE', 'Harare'),
        ('BULAWAYO', 'Bulawayo'),
        ('MANICALAND', 'Manicaland'),
        ('MASHONALAND_CENTRAL', 'Mashonaland Central'),
        ('MASHONALAND_EAST', 'Mashonaland East'),
        ('MASHONALAND_WEST', 'Mashonaland West'),
        ('MASVINGO', 'Masvingo'),
        ('MATABELELAND_NORTH', 'Matabeleland North'),
        ('MATABELELAND_SOUTH', 'Matabeleland South'),
        ('MIDLANDS', 'Midlands'),
    ]

    phone_number = models.CharField(
        max_length=20, 
        unique=True, 
        validators=[phone_regex],
        verbose_name="Phone Number"
    )
    email = models.EmailField(unique=True, null=True, blank=True, verbose_name="Email Address")
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, verbose_name="User Role")
    subscription_tier = models.CharField(
        max_length=20, 
        choices=SUB_TIER_CHOICES, 
        default='SEED',
        verbose_name="Subscription Tier"
    )
    kyc_status = models.CharField(
        max_length=20, 
        choices=KYC_STATUS_CHOICES, 
        default='UNVERIFIED',
        verbose_name="KYC Verification Status"
    )
    
    # KYC documents stored in S3
    national_id_photo = models.FileField(upload_to='kyc/national_ids/', null=True, blank=True, verbose_name="National ID Photo")
    selfie_photo = models.FileField(upload_to='kyc/selfies/', null=True, blank=True, verbose_name="Selfie Photo")
    business_registration_doc = models.FileField(upload_to='kyc/business_docs/', null=True, blank=True, verbose_name="Business Registration Document")
    tax_clearance_doc = models.FileField(upload_to='kyc/tax_docs/', null=True, blank=True, verbose_name="Tax Clearance Document")

    # Location Info
    province = models.CharField(max_length=50, choices=PROVINCE_CHOICES, verbose_name="Province")
    district = models.CharField(max_length=100, verbose_name="District")

    # Trust metric
    trust_score = models.FloatField(default=5.0, verbose_name="Trust Score")

    # Commercial Vetting Approval
    is_commercially_approved = models.BooleanField(default=False, verbose_name="Approved for Commercial Trading")

    # Payout details
    PAYOUT_CHANNEL_CHOICES = [
        ('ecocash', 'EcoCash'),
        ('onemoney', 'OneMoney'),
        ('telecash', 'TeleCash'),
        ('bank', 'Commercial Bank'),
    ]
    payout_channel = models.CharField(
        max_length=20, 
        choices=PAYOUT_CHANNEL_CHOICES, 
        default='ecocash', 
        verbose_name="Payout Channel"
    )
    payout_destination = models.CharField(
        max_length=100, 
        blank=True, 
        verbose_name="Payout Account / Phone Number"
    )
    payout_bank_name = models.CharField(
        max_length=100, 
        blank=True, 
        verbose_name="Payout Bank Name"
    )
    payout_account_name = models.CharField(
        max_length=150, 
        blank=True, 
        verbose_name="Payout Account Holder Name"
    )


    # Django User System fields
    is_active = models.BooleanField(default=True, verbose_name="Active")
    is_staff = models.BooleanField(default=False, verbose_name="Staff Member")
    date_joined = models.DateTimeField(auto_now_add=True, verbose_name="Date Joined")

    objects = UserManager()

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    class Meta:
        ordering = ['-date_joined']
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.phone_number} ({self.get_role_display()})"


class FarmProfile(models.Model):
    IRRIGATION_CHOICES = [
        ('RAINFED', 'Rainfed'),
        ('DRIP', 'Drip Irrigation'),
        ('PIVOT', 'Pivot Irrigation'),
        ('FLOOD', 'Flood Irrigation'),
    ]

    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='farm_profile',
        limit_choices_to={'role__in': ['SMALLHOLDER_FARMER', 'COMMERCIAL_FARMER']},
        verbose_name="User"
    )
    farm_name = models.CharField(max_length=150, verbose_name="Farm Trading Name")
    farm_size_hectares = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Farm Size (Hectares)")
    
    # GPS Coordinates
    farm_location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Latitude")
    farm_location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="Longitude")
    
    certified_organic = models.BooleanField(default=False, verbose_name="Certified Organic")
    gapps_certified = models.BooleanField(default=False, verbose_name="GAPPS Certified")
    
    primary_commodities = models.ManyToManyField(
        Commodity, 
        related_name='farms', 
        blank=True,
        verbose_name="Primary Commodities Grown"
    )
    annual_production_tonnes = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.0, 
        verbose_name="Approx Annual Yield (Tonnes)"
    )
    irrigation_type = models.CharField(max_length=30, choices=IRRIGATION_CHOICES, verbose_name="Irrigation Type")

    class Meta:
        ordering = ['farm_name']
        verbose_name = "Farm Profile"
        verbose_name_plural = "Farm Profiles"

    def __str__(self):
        return f"{self.farm_name} ({self.user.phone_number})"


class CommercialBuyerProfile(models.Model):
    BUYER_TYPE_CHOICES = [
        ('SUPERMARKET', 'Supermarket Chain'),
        ('FOOD_PROCESSOR', 'Food Processor'),
        ('HOTEL_HOSPITALITY', 'Hotel & Hospitality'),
        ('SCHOOL_INSTITUTION', 'School / Institution'),
        ('EXPORT_AGENT', 'Export Agent'),
        ('NGO', 'NGO / Aid Agency'),
        ('OTHER', 'Other'),
    ]

    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='commercial_buyer_profile',
        limit_choices_to={'role': 'COMMERCIAL_BUYER'},
        verbose_name="User"
    )
    company_name = models.CharField(max_length=150, verbose_name="Company Name")
    company_registration_number = models.CharField(max_length=50, verbose_name="Registration Number")
    buyer_type = models.CharField(max_length=30, choices=BUYER_TYPE_CHOICES, verbose_name="Buyer Type")
    annual_procurement_budget_usd = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=0.0, 
        verbose_name="Annual Budget (USD)"
    )
    preferred_commodities = models.ManyToManyField(
        Commodity, 
        related_name='commercial_buyers', 
        blank=True,
        verbose_name="Preferred Commodities"
    )
    # Delivery addresses represented as a list of named coordinates/addresses
    delivery_addresses = models.JSONField(default=list, blank=True, verbose_name="Delivery Locations")

    class Meta:
        ordering = ['company_name']
        verbose_name = "Commercial Buyer Profile"
        verbose_name_plural = "Commercial Buyer Profiles"

    def __str__(self):
        return f"{self.company_name} ({self.user.phone_number})"


class PhoneOTP(models.Model):
    phone_number = models.CharField(max_length=20, verbose_name="Phone Number")
    otp_code = models.CharField(max_length=6, verbose_name="OTP Code")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    expires_at = models.DateTimeField(verbose_name="Expires At")
    is_verified = models.BooleanField(default=False, verbose_name="Verified")

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Phone OTP"
        verbose_name_plural = "Phone OTPs"

    def __str__(self):
        return f"OTP for {self.phone_number} (Code: {self.otp_code})"

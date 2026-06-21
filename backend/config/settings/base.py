from pathlib import Path
from decouple import config
import warnings

# Suppress noisy third-party warnings
warnings.filterwarnings('ignore', category=UserWarning, module='django_fsm')
warnings.filterwarnings('ignore', category=UserWarning, message='.*Sandbox is currently not available.*')


# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='*').split(',')

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Application definition
INSTALLED_APPS = [
    # Daphne must be loaded before django.contrib.staticfiles
    'daphne',
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'storages',
    'drf_spectacular',
    
    # AgriMarket Local Apps
    'apps.accounts',
    'apps.listings',
    'apps.contracts',
    'apps.orders',
    'apps.payments',
    'apps.messaging',
    'apps.logistics',
    'apps.market_data',
    'apps.notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

import dj_database_url

# Database configuration (Supports DATABASE_URL connection strings e.g. for Neon, otherwise defaults to local Postgres)
DATABASE_URL = config('DATABASE_URL', default='')
if DATABASE_URL:
    is_postgres = DATABASE_URL.startswith('postgres')
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600 if is_postgres else 0,
            ssl_require=True if is_postgres else False
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='agrimarket'),
            'USER': config('DB_USER', default='postgres'),
            'PASSWORD': config('DB_PASSWORD', default='postgrespassword'),
            'HOST': config('DB_HOST', default='db'),
            'PORT': config('DB_PORT', default='5432', cast=int),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Harare'  # Zimbabwe Time Zone
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static_root'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# SimpleJWT settings
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# API Documentation Settings
DRF_SPECTACULAR_SETTINGS = {
    'TITLE': 'AgriMarket Zimbabwe API',
    'DESCRIPTION': 'Online marketplace platform connecting Zimbabwean farmers and buyers.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Redis & Channels Configuration
REDIS_URL = config('REDIS_URL', default='redis://redis:6379/0')
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
        },
    },
}

# Celery settings
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60

# Paynow Zimbabwe Settings
PAYNOW_INTEGRATION_ID = config('PAYNOW_INTEGRATION_ID', default='')
PAYNOW_INTEGRATION_KEY = config('PAYNOW_INTEGRATION_KEY', default='')
PAYNOW_RETURN_URL = config('PAYNOW_RETURN_URL', default='')
PAYNOW_RESULT_URL = config('PAYNOW_RESULT_URL', default='')

# Africa's Talking Settings
AFRICAS_TALKING_USERNAME = config('AFRICAS_TALKING_USERNAME', default='sandbox')
AFRICAS_TALKING_API_KEY = config('AFRICAS_TALKING_API_KEY', default='')

# -------------------------------------------------------------
# MULTI-CLOUD DEPLOYMENT CONFIGURATIONS (Vercel & Koyeb)
# -------------------------------------------------------------

# Dynamic CORS Configuration (Allows Vercel Frontend to communicate with Koyeb Backend)
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=True, cast=bool)
cors_env = config('CORS_ALLOWED_ORIGINS', default='')
CORS_ALLOWED_ORIGINS = cors_env.split(',') if cors_env else []

# -------------------------------------------------------------
# IMAGEKIT.IO NATIVE STORAGE PIPELINE
# -------------------------------------------------------------
# Completely bypasses AWS S3 and handles CRUD directly via the ImageKit SDK.
USE_IMAGEKIT = config('USE_IMAGEKIT', default=False, cast=bool)

if USE_IMAGEKIT:
    IMAGEKIT_PUBLIC_KEY = config('IMAGEKIT_PUBLIC_KEY')
    IMAGEKIT_PRIVATE_KEY = config('IMAGEKIT_PRIVATE_KEY')
    IMAGEKIT_URL_ENDPOINT = config('IMAGEKIT_URL_ENDPOINT')
    
    DEFAULT_FILE_STORAGE = 'config.storage.ImageKitStorage'
    MEDIA_URL = f'{IMAGEKIT_URL_ENDPOINT}/'
else:
    # Local Storage Fallback
    DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
    MEDIA_URL = '/media/'

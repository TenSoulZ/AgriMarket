import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from .base import *

DEBUG = False

# Allowed Hosts
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='alone-camile-soulzsystems-29ab31ef.koyeb.app,localhost,127.0.0.1').split(',')

# CORS configuration
FRONTEND_URL = config('FRONTEND_URL', default='https://agrimarket-web.vercel.app')
CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
]

# CSRF configuration
CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
    'https://alone-camile-soulzsystems-29ab31ef.koyeb.app',
]

# Security headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# AWS S3 Storage for Media Uploads (af-south-1)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='af-south-1')
AWS_S3_SIGNATURE_VERSION = 's3v4'
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None

if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY and AWS_STORAGE_BUCKET_NAME:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'

# Sentry SDK Error Tracking
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2, # sample 20% in prod to keep logs manageable
        send_default_pii=True,
    )

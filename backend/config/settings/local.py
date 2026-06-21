from .base import *

DEBUG = True

# Allows all origins for local frontend development
CORS_ALLOW_ALL_ORIGINS = True

# Explicitly set CORS whitelist if needed in future
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Local file storage for uploads instead of AWS S3
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Local development overrides for running without Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True


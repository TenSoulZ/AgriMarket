import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

# Set default settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

# Initialize ASGI application early to ensure AppRegistry is populated before importing consumers
django_asgi_app = get_asgi_application()

# Safely import custom WebSocket routing and JWT middleware (to avoid boot errors before apps are built)
websocket_urlpatterns = []
try:
    from apps.messaging.routing import websocket_urlpatterns
except ImportError:
    pass

try:
    from apps.messaging.middleware import JWTAuthMiddlewareStack
except ImportError:
    from channels.auth import AuthMiddlewareStack as JWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})

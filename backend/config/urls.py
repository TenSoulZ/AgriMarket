from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

api_v1_urlpatterns = [
    path('', include('apps.accounts.urls')),
    path('', include('apps.listings.urls')),
    path('', include('apps.contracts.urls')),
    path('', include('apps.orders.urls')),
    path('payments/', include('apps.payments.urls')),
    path('messaging/', include('apps.messaging.urls')),
    path('logistics/', include('apps.logistics.urls')),
    path('market-data/', include('apps.market_data.urls')),
]

from django.http import JsonResponse

def api_root_view(request):
    return JsonResponse({
        "name": "AgriMarket Zimbabwe API Gateway",
        "status": "healthy",
        "version": "1.0.0",
        "documentation": "/api/schema/swagger-ui/"
    })

urlpatterns = [
    path('', api_root_view, name='api-root'),
    path('admin/', admin.site.urls),
    path('api/v1/', include(api_v1_urlpatterns)),
    
    # API Schema and Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

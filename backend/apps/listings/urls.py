from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ListingViewSet, WholesaleListingViewSet

router = DefaultRouter()
router.register(r'listings/categories', CategoryViewSet, basename='category')
router.register(r'listings', ListingViewSet, basename='listing')
router.register(r'wholesale', WholesaleListingViewSet, basename='wholesale')

urlpatterns = [
    path('', include(router.urls)),
]

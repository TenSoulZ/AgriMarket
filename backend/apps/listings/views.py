from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import timedelta

from .models import Category, Listing, WholesaleListing, ListingImage
from .serializers import CategorySerializer, ListingSerializer, WholesaleListingSerializer

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of a listing to edit it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.farmer == request.user or request.user.role == 'ADMIN'


class CanAccessWholesaleBoard(permissions.BasePermission):
    """
    Wholesale Board permission:
    - ENTERPRISE tier or COMMERCIAL tier required to view (read).
    - COMMERCIAL tier required to transact (write).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'ADMIN':
            return True
            
        # Read-only actions (list, retrieve)
        if request.method in permissions.SAFE_METHODS:
            return request.user.subscription_tier in ['ENTERPRISE', 'COMMERCIAL']
            
        # Write actions (create)
        return (
            request.user.role == 'COMMERCIAL_FARMER' and 
            request.user.subscription_tier == 'COMMERCIAL'
        )

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.farmer == request.user


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly list of categories.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]


class ListingViewSet(viewsets.ModelViewSet):
    """
    Retail Listings endpoint. 
    Allows unauthenticated users to browse and search, but requires authenticated owners to modify.
    """
    queryset = Listing.objects.filter(is_active=True)
    serializer_class = ListingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    filterset_fields = {
        'category': ['exact'],
        'location_province': ['exact'],
        'price_per_kg_usd_cents': ['gte', 'lte'],
        'quantity_available_kg': ['gte'],
    }
    search_fields = ['title', 'description', 'location_district']
    ordering_fields = ['created_at', 'price_per_kg_usd_cents', 'quantity_available_kg']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [permissions.AllowAny]
        else:
            permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
        return [permission() for permission in permission_classes]

    def perform_destroy(self, instance):
        # Soft delete: mark inactive
        instance.is_active = False
        instance.save()


class WholesaleListingViewSet(viewsets.ModelViewSet):
    """
    Wholesale Listings endpoint. 
    Enforces that only ENTERPRISE+ users can read, and only COMMERCIAL tier can post.
    """
    queryset = WholesaleListing.objects.filter(is_active=True)
    serializer_class = WholesaleListingSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    permission_classes = [CanAccessWholesaleBoard]

    filterset_fields = {
        'commodity': ['exact'],
        'category': ['exact'],
        'quality_grade': ['exact'],
        'moisture_content_pct': ['lte'],
        'min_order_quantity_tonnes': ['gte', 'lte'],
    }
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'price_per_tonne_usd_cents', 'quantity_available_tonnes']

    def perform_destroy(self, instance):
        # Soft delete
        instance.is_active = False
        instance.save()

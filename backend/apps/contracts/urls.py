from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFQViewSet, BulkContractViewSet, ForwardContractViewSet

router = DefaultRouter()
router.register(r'contracts/rfqs', RFQViewSet, basename='rfq')
router.register(r'contracts/bulk', BulkContractViewSet, basename='bulk-contract')
router.register(r'contracts/forward', ForwardContractViewSet, basename='forward-contract')

urlpatterns = [
    path('', include(router.urls)),
]

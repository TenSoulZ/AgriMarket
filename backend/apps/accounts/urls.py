from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from .views import (
    OTPRequestView,
    OTPVerifyView,
    RegisterView,
    UserProfileView,
    KYCDocumentUploadView,
    AdminUserListView,
    AdminUserVerifyView,
)

urlpatterns = [
    # Auth routing
    path('auth/login/', TokenObtainPairView.as_view(), name='token-obtain-pair'),
    path('auth/otp/request/', OTPRequestView.as_view(), name='otp-request'),
    path('auth/otp/verify/', OTPVerifyView.as_view(), name='otp-verify'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # User Profile / KYC routing
    path('users/profile/', UserProfileView.as_view(), name='user-profile'),
    path('users/kyc/', KYCDocumentUploadView.as_view(), name='user-kyc-upload'),

    # Admin Panel Routing
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:user_id>/verify/', AdminUserVerifyView.as_view(), name='admin-user-verify'),
]


import logging
from django.utils import timezone
from rest_framework import status, permissions, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, PhoneOTP, FarmProfile, CommercialBuyerProfile
from .serializers import (
    OTPRequestSerializer,
    OTPVerifySerializer,
    RegisterSerializer,
    UserSerializer,
    KYCDocumentSerializer
)
from .utils import generate_otp, send_otp_sms

logger = logging.getLogger(__name__)

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class OTPRequestView(APIView):
    """
    Step 1 of Login Flow: Requests an SMS OTP.
    Fails if the user does not exist (they must Register first).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            
            # Check if user exists
            if not User.objects.filter(phone_number=phone_number).exists():
                return Response(
                    {"error": "Phone number not registered. Please register first."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Generate and send OTP
            otp_obj = generate_otp(phone_number)
            send_otp_sms(phone_number, otp_obj.otp_code)
            
            return Response(
                {"message": "Verification code sent successfully."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(APIView):
    """
    User Registration: Creates an inactive user and triggers SMS OTP.
    Verification of the OTP completes the registration (activates the user).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Trigger OTP
            otp_obj = generate_otp(user.phone_number)
            send_otp_sms(user.phone_number, otp_obj.otp_code)
            
            return Response(
                {
                    "message": "Registration initiated. Verification code sent.",
                    "phone_number": user.phone_number
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OTPVerifyView(APIView):
    """
    Step 2 of Login / Registration: Verifies OTP code and returns JWT.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            otp_code = serializer.validated_data['otp_code']
            
            # Find matching active OTP
            otp_query = PhoneOTP.objects.filter(
                phone_number=phone_number,
                otp_code=otp_code,
                is_verified=False,
                expires_at__gt=timezone.now()
            ).first()
            
            if not otp_query:
                return Response(
                    {"error": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Mark OTP as verified
            otp_query.is_verified = True
            otp_query.save()
            
            # Retrieve and activate user (handles registration completion)
            try:
                user = User.objects.get(phone_number=phone_number)
                if not user.is_active:
                    user.is_active = True
                    user.save()
            except User.DoesNotExist:
                return Response(
                    {"error": "User record not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Generate JWT Tokens
            tokens = get_tokens_for_user(user)
            user_data = UserSerializer(user).data
            
            return Response(
                {
                    "tokens": tokens,
                    "user": user_data
                },
                status=status.HTTP_200_OK
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """
    Retrieves or updates the active user's details and profile sub-models.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class KYCDocumentUploadView(APIView):
    """
    Handles file uploads for KYC documents. 
    Swaps status to PENDING upon successful uploads.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = KYCDocumentSerializer(request.user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            
            # Transition KYC status to pending review
            request.user.kyc_status = 'PENDING'
            request.user.save()
            
            return Response(
                {
                    "message": "KYC Documents uploaded successfully. Profile status updated to Pending Review.",
                    "kyc_status": request.user.kyc_status
                },
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class IsPlatformAdmin(permissions.BasePermission):
    """
    Permission class checking if the user is an admin or staff member.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (request.user.is_staff or request.user.role == 'ADMIN')


class AdminUserListView(generics.ListAPIView):
    """
    Lists all users for admin review.
    """
    permission_classes = [IsPlatformAdmin]
    serializer_class = UserSerializer
    queryset = User.objects.all().order_by('kyc_status', '-date_joined')


class AdminUserVerifyView(APIView):
    """
    Allows admin to verify a user's KYC documents and toggle commercial trading approval.
    """
    permission_classes = [IsPlatformAdmin]

    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        kyc_status = request.data.get('kyc_status')
        is_commercially_approved = request.data.get('is_commercially_approved')

        if kyc_status is not None:
            if kyc_status not in [c[0] for c in User.KYC_STATUS_CHOICES]:
                return Response({"error": "Invalid KYC status value."}, status=status.HTTP_400_BAD_REQUEST)
            user.kyc_status = kyc_status

        if is_commercially_approved is not None:
            user.is_commercially_approved = bool(is_commercially_approved)

        user.save()
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


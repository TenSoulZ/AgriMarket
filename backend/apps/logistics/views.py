from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.logistics.models import Transporter, LoadPost, LogisticsPool, FleetBooking
from apps.logistics.serializers import (
    TransporterSerializer, LoadPostSerializer,
    LogisticsPoolSerializer, FleetBookingSerializer
)

class TransporterSignUpView(generics.CreateAPIView):
    """
    Endpoint for a user to register themselves as a Transporter.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransporterSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LoadPostListCreateView(generics.ListCreateAPIView):
    """
    Endpoint to list user's LoadPosts or create new ones.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LoadPostSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'ADMIN':
            return LoadPost.objects.all()
        return LoadPost.objects.filter(creator=user)

    def perform_create(self, serializer):
        serializer.save(creator=self.request.user)
        try:
            from apps.logistics.tasks import pool_open_loads
            pool_open_loads()
        except Exception:
            pass



class LogisticsPoolListView(generics.ListAPIView):
    """
    Endpoint to list all available Logistics Pools.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LogisticsPoolSerializer
    queryset = LogisticsPool.objects.all()


class FleetBookingListCreateView(generics.ListCreateAPIView):
    """
    Endpoint to list or create Fleet Bookings.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FleetBookingSerializer

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'transporter_profile'):
            return FleetBooking.objects.filter(transporter=user.transporter_profile)
        return FleetBooking.objects.filter(booked_by=user)

    def perform_create(self, serializer):
        serializer.save(booked_by=self.request.user)

from django.urls import path
from apps.logistics.views import (
    TransporterSignUpView, LoadPostListCreateView,
    LogisticsPoolListView, FleetBookingListCreateView
)

app_name = 'logistics'

urlpatterns = [
    path('transporters/signup/', TransporterSignUpView.as_view(), name='transporter-signup'),
    path('load-posts/', LoadPostListCreateView.as_view(), name='load-posts'),
    path('pools/', LogisticsPoolListView.as_view(), name='pools'),
    path('bookings/', FleetBookingListCreateView.as_view(), name='bookings'),
]

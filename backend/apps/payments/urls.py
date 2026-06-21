from django.urls import path
from apps.payments.views import InitiatePaymentView, PaynowWebhookView

app_name = 'payments'

urlpatterns = [
    path('initiate/', InitiatePaymentView.as_view(), name='initiate'),
    path('webhook/', PaynowWebhookView.as_view(), name='webhook'),
]

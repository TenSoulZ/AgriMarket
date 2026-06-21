from django.urls import path
from apps.market_data.views import (
    CommodityListView, CommodityDetailView, CommodityPriceListView, CommodityPriceDetailView,
    PriceAlertListCreateView, PriceIndexListView, WeatherAdvisoryView,
    YieldForecastView, SyncMarketPricesView,
    CommodityTemplateView, CommodityBulkUploadView,
    PriceTemplateView, PriceBulkUploadView
)

app_name = 'market_data'

urlpatterns = [
    path('commodities/', CommodityListView.as_view(), name='commodities'),
    path('commodities/<int:pk>/', CommodityDetailView.as_view(), name='commodity-detail'),
    path('commodities/template/', CommodityTemplateView.as_view(), name='commodities-template'),
    path('commodities/bulk-upload/', CommodityBulkUploadView.as_view(), name='commodities-upload'),
    path('prices/', CommodityPriceListView.as_view(), name='prices'),
    path('prices/<int:pk>/', CommodityPriceDetailView.as_view(), name='price-detail'),
    path('prices/template/', PriceTemplateView.as_view(), name='prices-template'),
    path('prices/bulk-upload/', PriceBulkUploadView.as_view(), name='prices-upload'),
    path('prices/sync/', SyncMarketPricesView.as_view(), name='prices-sync'),
    path('alerts/', PriceAlertListCreateView.as_view(), name='alerts'),
    path('indices/', PriceIndexListView.as_view(), name='indices'),
    path('weather/', WeatherAdvisoryView.as_view(), name='weather'),
    path('forecast/', YieldForecastView.as_view(), name='forecast'),
]

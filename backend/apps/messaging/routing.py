from django.urls import re_path
from apps.messaging.consumers import ChatConsumer, ContractNegotiationConsumer

websocket_urlpatterns = [
    re_path(r'^ws/chat/(?P<conversation_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/negotiate/(?P<contract_id>\d+)/$', ContractNegotiationConsumer.as_asgi()),
]

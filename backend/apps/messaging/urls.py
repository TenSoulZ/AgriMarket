from django.urls import path
from apps.messaging.views import ConversationListCreateView, MessageHistoryView

app_name = 'messaging'

urlpatterns = [
    path('conversations/', ConversationListCreateView.as_view(), name='conversations'),
    path('conversations/<int:conversation_id>/messages/', MessageHistoryView.as_view(), name='messages'),
]

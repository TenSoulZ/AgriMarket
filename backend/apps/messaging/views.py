from rest_framework import generics, permissions, status, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from apps.messaging.models import Conversation, Message
from apps.messaging.serializers import ConversationSerializer, MessageSerializer

class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        # Return conversations where the authenticated user is a participant
        return Conversation.objects.filter(participants=self.request.user)

    def perform_create(self, serializer):
        # Save conversation first
        conversation = serializer.save()
        # Add the current user and any specified participants
        participants = self.request.data.get('participants', [])
        conversation.participants.add(self.request.user)
        for p_id in participants:
            if p_id != self.request.user.id:
                conversation.participants.add(p_id)


class MessageHistoryView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        # Check if conversation exists and user is a participant
        return Message.objects.filter(
            conversation_id=conversation_id,
            conversation__participants=self.request.user
        )

    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_id')
        try:
            conversation = Conversation.objects.filter(participants=self.request.user).get(id=conversation_id)
        except Conversation.DoesNotExist:
            raise serializers.ValidationError("Conversation does not exist or you are not a participant.")
        
        message = serializer.save(sender=self.request.user, conversation=conversation)
        # Update updated_at of conversation
        conversation.save()

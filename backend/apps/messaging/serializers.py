from rest_framework import serializers
from apps.messaging.models import Conversation, Message, ContractProposal
from apps.accounts.serializers import UserSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender_detail = UserSerializer(source='sender', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_detail', 
            'text', 'attachment', 'created_at'
        ]
        read_only_fields = ['id', 'conversation', 'sender', 'created_at']

class ConversationSerializer(serializers.ModelSerializer):
    participants_detail = UserSerializer(source='participants', many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'participants_detail', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ContractProposalSerializer(serializers.ModelSerializer):
    proposed_by_detail = UserSerializer(source='proposed_by', read_only=True)

    class Meta:
        model = ContractProposal
        fields = [
            'id', 'contract', 'proposed_by', 'proposed_by_detail',
            'price_per_tonne_usd_cents', 'qty_tonnes', 'deposit_pct', 
            'terms_text', 'is_accepted', 'is_rejected', 'created_at'
        ]
        read_only_fields = ['id', 'proposed_by', 'is_accepted', 'is_rejected', 'created_at']

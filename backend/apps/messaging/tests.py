from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from apps.accounts.models import User
from apps.messaging.models import Conversation, Message

class MessagingTests(APITestCase):
    def setUp(self):
        # Create test users
        self.farmer = User.objects.create_user(
            phone_number='+263771111111',
            role='SMALLHOLDER_FARMER',
            province='HARARE',
            district='Harare Central',
            is_active=True
        )
        self.buyer = User.objects.create_user(
            phone_number='+263772222222',
            role='RETAIL_BUYER',
            province='HARARE',
            district='Harare Central',
            is_active=True
        )
        self.intruder = User.objects.create_user(
            phone_number='+263773333333',
            role='RETAIL_BUYER',
            province='HARARE',
            district='Harare Central',
            is_active=True
        )

        # Setup authentication
        self.client.force_authenticate(user=self.farmer)

        # Create a pre-existing conversation
        self.conversation = Conversation.objects.create()
        self.conversation.participants.add(self.farmer, self.buyer)

    def test_conversation_list_only_shows_participating_conversations(self):
        url = reverse('messaging:conversations')
        
        # Farmer checks conversations
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

        # Intruder checks conversations
        self.client.force_authenticate(user=self.intruder)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_create_conversation_attaches_current_user_and_participants(self):
        url = reverse('messaging:conversations')
        data = {
            'participants': [self.buyer.id]
        }
        
        # Farmer creates a new conversation with Buyer
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        conversation_id = response.data['id']
        conversation = Conversation.objects.get(id=conversation_id)
        self.assertIn(self.farmer, conversation.participants.all())
        self.assertIn(self.buyer, conversation.participants.all())

    def test_send_message_in_authorized_conversation(self):
        url = reverse('messaging:messages', kwargs={'conversation_id': self.conversation.id})
        data = {
            'text': 'Hello buyer, beans are ready.'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.filter(conversation=self.conversation).count(), 1)
        self.assertEqual(Message.objects.first().text, 'Hello buyer, beans are ready.')

    def test_send_message_blocks_non_participant(self):
        # Authenticate as Intruder
        self.client.force_authenticate(user=self.intruder)
        url = reverse('messaging:messages', kwargs={'conversation_id': self.conversation.id})
        data = {
            'text': 'I am trying to send a message to a chat I do not belong to.'
        }
        
        response = self.client.post(url, data, format='json')
        # ValidationError / status 400 because conversation doesn't exist for this user query
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_message_history_blocks_non_participant(self):
        # Authenticate as Intruder
        self.client.force_authenticate(user=self.intruder)
        url = reverse('messaging:messages', kwargs={'conversation_id': self.conversation.id})
        
        response = self.client.get(url)
        # Should return an empty list or block access (our view filters by participants)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from apps.messaging.models import Conversation, Message, ContractProposal
from apps.contracts.models import BulkContract

logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f"chat_{self.conversation_id}"
        self.user = self.scope.get('user', AnonymousUser())

        if self.user.is_anonymous:
            logger.warning("Rejecting anonymous connection to ChatConsumer.")
            await self.close()
            return

        # Verify participant status
        is_allowed = await self.check_participant(self.conversation_id, self.user)
        if not is_allowed:
            logger.warning(f"Rejecting user {self.user} not in conversation {self.conversation_id}")
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            text = data.get('text', '')
            if not text:
                return

            # Save message to DB
            message = await self.save_message(self.conversation_id, self.user, text)
            
            # Broadcast to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message_id': message.id,
                    'text': message.text,
                    'sender_id': self.user.id,
                    'sender_phone': self.user.phone_number,
                    'created_at': str(message.created_at)
                }
            )
        except Exception as e:
            logger.exception("Error receiving WebSocket message")

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message_id': event['message_id'],
            'text': event['text'],
            'sender_id': event['sender_id'],
            'sender_phone': event['sender_phone'],
            'created_at': event['created_at']
        }))

    @database_sync_to_async
    def check_participant(self, conversation_id, user):
        return Conversation.objects.filter(id=conversation_id, participants=user).exists()

    @database_sync_to_async
    def save_message(self, conversation_id, user, text):
        conversation = Conversation.objects.get(id=conversation_id)
        # Touch conversation to update updated_at timestamp
        conversation.save()
        return Message.objects.create(
            conversation=conversation,
            sender=user,
            text=text
        )


class ContractNegotiationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.contract_id = self.scope['url_route']['kwargs']['contract_id']
        self.room_group_name = f"negotiation_{self.contract_id}"
        self.user = self.scope.get('user', AnonymousUser())

        if self.user.is_anonymous:
            await self.close()
            return

        # Check permission (must be farmer or buyer of the contract)
        is_allowed = await self.check_contract_parties(self.contract_id, self.user)
        if not is_allowed:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get('action') # 'PROPOSE', 'ACCEPT', 'REJECT'
            
            if action == 'PROPOSE':
                price = int(data.get('price_per_tonne_usd_cents', 0))
                qty = float(data.get('qty_tonnes', 0))
                deposit = float(data.get('deposit_pct', 20.0))
                terms = data.get('terms_text', '')
                
                if price <= 0 or qty <= 0:
                    await self.send(text_data=json.dumps({"error": "Invalid price or quantity proposed."}))
                    return
                
                proposal = await self.create_proposal(self.contract_id, self.user, price, qty, deposit, terms)
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'negotiation_proposal',
                        'proposal_id': proposal.id,
                        'proposed_by_id': self.user.id,
                        'price_per_tonne_usd_cents': proposal.price_per_tonne_usd_cents,
                        'qty_tonnes': str(proposal.qty_tonnes),
                        'deposit_pct': str(proposal.deposit_pct),
                        'terms_text': proposal.terms_text,
                        'created_at': str(proposal.created_at)
                    }
                )
            elif action == 'ACCEPT':
                result = await self.accept_latest_proposal(self.contract_id, self.user)
                if not result:
                    await self.send(text_data=json.dumps({"error": "No valid proposal to accept or unauthorized."}))
                    return
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'negotiation_accept',
                        'proposal_id': result['proposal_id'],
                        'accepted_by_id': self.user.id,
                        'contract_id': self.contract_id,
                        'updated_price': result['price'],
                        'updated_qty': result['qty'],
                        'updated_deposit': result['deposit'],
                        'updated_terms': result['terms']
                    }
                )
            elif action == 'REJECT':
                proposal_id = await self.reject_latest_proposal(self.contract_id, self.user)
                if not proposal_id:
                    await self.send(text_data=json.dumps({"error": "No valid proposal to reject."}))
                    return
                
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'negotiation_reject',
                        'proposal_id': proposal_id,
                        'rejected_by_id': self.user.id
                    }
                )
        except Exception as e:
            logger.exception("Error in ContractNegotiationConsumer")
            await self.send(text_data=json.dumps({"error": "An internal error occurred during negotiation processing."}))

    async def negotiation_proposal(self, event):
        await self.send(text_data=json.dumps({
            'action': 'PROPOSAL',
            'proposal_id': event['proposal_id'],
            'proposed_by_id': event['proposed_by_id'],
            'price_per_tonne_usd_cents': event['price_per_tonne_usd_cents'],
            'qty_tonnes': event['qty_tonnes'],
            'deposit_pct': event['deposit_pct'],
            'terms_text': event['terms_text'],
            'created_at': event['created_at']
        }))

    async def negotiation_accept(self, event):
        await self.send(text_data=json.dumps({
            'action': 'ACCEPTED',
            'proposal_id': event['proposal_id'],
            'accepted_by_id': event['accepted_by_id'],
            'contract_id': event['contract_id'],
            'price_per_tonne_usd_cents': event['updated_price'],
            'qty_tonnes': event['updated_qty'],
            'deposit_pct': event['updated_deposit'],
            'terms_text': event['updated_terms']
        }))

    async def negotiation_reject(self, event):
        await self.send(text_data=json.dumps({
            'action': 'REJECTED',
            'proposal_id': event['proposal_id'],
            'rejected_by_id': event['rejected_by_id']
        }))

    @database_sync_to_async
    def check_contract_parties(self, contract_id, user):
        try:
            contract = BulkContract.objects.get(id=contract_id)
            return user == contract.farmer or user == contract.buyer
        except BulkContract.DoesNotExist:
            return False

    @database_sync_to_async
    def create_proposal(self, contract_id, user, price, qty, deposit, terms):
        contract = BulkContract.objects.get(id=contract_id)
        return ContractProposal.objects.create(
            contract=contract,
            proposed_by=user,
            price_per_tonne_usd_cents=price,
            qty_tonnes=qty,
            deposit_pct=deposit,
            terms_text=terms
        )

    @database_sync_to_async
    def accept_latest_proposal(self, contract_id, user):
        contract = BulkContract.objects.get(id=contract_id)
        # Retrieve latest proposal
        proposal = ContractProposal.objects.filter(contract=contract, is_accepted=False, is_rejected=False).order_by('-created_at').first()
        if not proposal:
            return None
        
        # Cannot accept own proposal
        if proposal.proposed_by == user:
            return None
        
        proposal.is_accepted = True
        proposal.save()
        
        # Apply proposed changes to bulk contract
        contract.price_per_tonne_usd_cents = proposal.price_per_tonne_usd_cents
        contract.total_qty_tonnes = proposal.qty_tonnes
        contract.terms_text = proposal.terms_text
        contract.save()
        
        return {
            'proposal_id': proposal.id,
            'price': contract.price_per_tonne_usd_cents,
            'qty': str(contract.total_qty_tonnes),
            'deposit': str(proposal.deposit_pct),
            'terms': contract.terms_text
        }

    @database_sync_to_async
    def reject_latest_proposal(self, contract_id, user):
        contract = BulkContract.objects.get(id=contract_id)
        proposal = ContractProposal.objects.filter(contract=contract, is_accepted=False, is_rejected=False).order_by('-created_at').first()
        if not proposal or proposal.proposed_by == user:
            return None
        
        proposal.is_rejected = True
        proposal.save()
        return proposal.id

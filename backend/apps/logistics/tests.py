from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.logistics.models import LoadPost, LogisticsPool, PoolMembership
from apps.logistics.serializers import LogisticsPoolSerializer
from apps.market_data.models import Commodity

User = get_user_model()

@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class LogisticsTestCase(TestCase):

    def setUp(self):
        from config.celery import app
        app.conf.task_always_eager = True
        app.conf.broker_url = 'memory://'
        app.conf.result_backend = 'cache+memory://'

        self.commodity = Commodity.objects.create(name="Cotton", description="Cotton Seed")
        self.user = User.objects.create_user(phone_number="+263771111111", role="SMALLHOLDER_FARMER")


    def test_load_post_creation_triggers_pooling(self):
        # 1. Create first load post (2000kg)
        p1 = LoadPost.objects.create(
            creator=self.user,
            commodity=self.commodity,
            weight_kg=2000,
            origin_district="Gokwe South",
            destination_district="Bulawayo Depot",
            target_pickup_date=timezone.now().date()
        )
        p1.refresh_from_db()
        self.assertEqual(p1.status, 'OPEN')
        self.assertEqual(LogisticsPool.objects.count(), 0)

        # 2. Create second load post (3200kg) via REST view to trigger pooling (combined 5200kg >= 5000kg)
        from rest_framework.test import APIClient
        from django.urls import reverse
        from rest_framework import status

        client = APIClient()
        client.force_authenticate(user=self.user)

        url = reverse('logistics:load-posts')
        response = client.post(url, {
            'commodity': self.commodity.id,
            'weight_kg': 3200,
            'origin_district': "Gokwe South",
            'destination_district': "Bulawayo Depot",
            'target_pickup_date': str(timezone.now().date())
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Verify that a pool was created and posts transitioned
        self.assertEqual(LogisticsPool.objects.count(), 1)
        pool = LogisticsPool.objects.first()
        self.assertEqual(pool.origin_district, "Gokwe South")
        self.assertEqual(pool.destination_district, "Bulawayo Depot")
        self.assertEqual(pool.total_weight_kg, 5200)

        p1.refresh_from_db()
        self.assertEqual(p1.status, 'POOLED')

        # 4. Verify LogisticsPoolSerializer computed fields
        serializer = LogisticsPoolSerializer(pool)
        data = serializer.data
        self.assertEqual(data['origin_district'], "Gokwe South")
        self.assertEqual(data['destination_district'], "Bulawayo Depot")
        self.assertEqual(data['commodity_type'], "Cotton")
        self.assertEqual(data['current_weight_kg'], 5200)
        self.assertEqual(data['member_count'], 2)

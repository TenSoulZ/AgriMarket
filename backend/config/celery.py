import os
from celery import Celery

# Set default settings module for local dev
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')

app = Celery('agrimarket')

# Config from Django settings, prefixing with 'CELERY_'
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in registered django apps
app.autodiscover_tasks()

@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')

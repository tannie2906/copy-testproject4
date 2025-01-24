# utils.py in myapp/
from .models import Notification

def create_notification(user, message):
    """Create a new notification for a user."""
    Notification.objects.create(user=user, message=message)
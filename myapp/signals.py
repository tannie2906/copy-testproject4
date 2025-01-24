# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Profile  # Ensure Profile model is imported
from django.db import IntegrityError

#@receiver(post_save, sender=User)
#def create_profile(sender, instance, created, **kwargs):
  #  if created:
   #     Profile.objects.create(user=instance)

def save_profile(sender, instance, created, **kwargs):
    if created:  # If the user is newly created
        Profile.objects.create(user=instance)
    elif not hasattr(instance, 'profile'):  # If no profile exists
        instance.profile = Profile.objects.create(user=instance)
    instance.profile.save()


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:  # Only create a profile for new users
        try:
            # Get or create a Profile for the user
            profile, created = Profile.objects.get_or_create(user=instance)

            # Optionally, you can update the profile fields here
            # For example: profile.some_field = value
            # profile.save()

        except IntegrityError:
            # Handle the case where a unique constraint error occurs
            print("Profile already exists for this user")
            return None
    else:
        # If the user already exists, just skip creating a new profile
        pass

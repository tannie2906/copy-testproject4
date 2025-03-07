from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.timezone import now
from django.utils.text import slugify
from django.conf import settings
from django.db import models
from django import forms
import uuid
import os
from django_otp.models import Device
from datetime import datetime
from django.contrib.auth.hashers import make_password
from django.contrib.auth.hashers import check_password

def custom_file_name(instance, filename):
    # Extract file extension
    _, ext = os.path.splitext(filename)
    # Use the custom name provided in the 'name' field
    return os.path.join('uploads/', f"{instance.name}{ext}")

# In your models.py
class Folder(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')

    def __str__(self):
        return self.name

    @property
    def path(self):
        if self.parent_folder:
            return os.path.join(self.parent_folder.path, self.name)
        return self.name

# handling upload file with custom name and storage
class File(models.Model):
    id = models.AutoField(primary_key=True)
    file = models.FileField(upload_to='uploads/')
    #user_id = models.IntegerField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file_name = models.CharField(max_length=255)
    deleted_at = models.DateTimeField(null=True, blank=True)
    size = models.IntegerField()
    is_deleted = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, default=None)
    is_locked = models.BooleanField(default=False)


    # Custom save method
    def save(self, *args, **kwargs):
        if self.file and self.file_name:
            folder = 'uploads'
            extension = os.path.splitext(self.file.name)[1]
            custom_name = f"{slugify(self.file_name)}{extension}"
            self.file.name = os.path.join(folder, custom_name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.file_name

# sharing files with specific users.
class SharedFile(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE)
    shared_with = models.EmailField()
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="shared_files")
    created_at = models.DateTimeField(auto_now_add=True)
    share_token = models.CharField(
        max_length=255, 
        default=uuid.uuid4,  # Generates a unique token
        unique=True
    )
    expiry_time = models.DateTimeField()
    password_hash = models.CharField(max_length=255, blank=True, null=True)
    allow_download = models.BooleanField(default=False)  # Can download?
    one_time_view = models.BooleanField(default=False)  
    has_been_viewed = models.BooleanField(default=False)  


    def is_expired(self):
        return now() > self.expiry_time
    
    def set_password(self, password):
        """Hash and store the password securely"""
        if password:
            self.password_hash = make_password(password)

    def check_password(self, password):
        """Verify the entered password"""
        if self.password_hash:
            return check_password(password, self.password_hash)
        return True  # If no password was set, allow access
    
class UploadedFile(models.Model):
    file_name = models.CharField(max_length=100)
    file = models.FileField(upload_to='uploads/')  # Directory where files are saved
    upload_date = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    is_deleted = models.BooleanField(default=False)  # Soft delete flag  # New field to mark deleted files

    def __str__(self):
        return self.file_name
    
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    # Add other fields as needed
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    email = models.EmailField(max_length=254, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    otp = models.IntegerField(null=True, blank=True)  # Field for storing OTP
    otp_created_at = models.DateTimeField(null=True, blank=True)  # Field for OTP timestamp
    otp_secret = models.CharField(max_length=255, blank=True, null=True)


    def __str__(self):
        return self.user.username  

class CustomUserCreationForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not email:
            raise forms.ValidationError("Email is required")
        return email
            
class DeletedFile(models.Model):
    id = models.AutoField(primary_key=True)
   # file = models.FileField(upload_to='uploads/') 
    #file = models.FileField(upload_to='trash/')
    file = models.CharField(max_length=500)  # Trash path
    user_id = models.IntegerField()
    file_name = models.CharField(max_length=255)
    deleted_at = models.DateTimeField(default=now)
    size = models.IntegerField()

    def __str__(self):
        return self.file_name

class MyOTPDevice(Device):
    pass  # Extend or customize if needed

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=datetime.now)

    def __str__(self):
        return f'Notification for {self.user.username}: {self.message}'
    
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=50)  # e.g., 'upload', 'download'
    file = models.ForeignKey('File', on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

class Lockbox(models.Model):
    user = models.OneToOneField('auth.User', on_delete=models.CASCADE)
    password_hash = models.CharField(max_length=255)

    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)
        self.save()

    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)
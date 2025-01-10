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

def custom_file_name(instance, filename):
    # Extract file extension
    _, ext = os.path.splitext(filename)
    # Use the custom name provided in the 'name' field
    return os.path.join('uploads/', f"{instance.name}{ext}")

# In your models.py
class Folder(models.Model):
    name = models.CharField(max_length=255)
    parent_folder = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.name

    @property
    def path(self):
        path_parts = []
        parent = self.parent_folder
        while parent:
            path_parts.insert(0, parent.name)
            parent = parent.parent_folder
        return '/'.join(path_parts) + '/' + self.name if path_parts else self.name

    
# handling upload file with custom name and storage
class File(models.Model):
    id = models.AutoField(primary_key=True)
    file = models.FileField(upload_to='uploads/')
    user_id = models.IntegerField()
    file_name = models.CharField(max_length=255)
    deleted_at = models.DateTimeField(null=True, blank=True)
    size = models.IntegerField()
    is_deleted = models.BooleanField(default=False)
    is_starred = models.BooleanField(default=False)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE)


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
    file = models.ForeignKey('File', on_delete=models.CASCADE)  # Replace 'File' with your file model
    shared_with = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_files')
    shared_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shared_by')
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Shared {self.file.name} with {self.shared_with}"
    
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
    otp_secret = models.CharField(max_length=255, blank=True, null=True) #for 2fa

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
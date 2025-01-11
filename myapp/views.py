import base64
from datetime import datetime, timezone
import mimetypes
from pathlib import Path
import random
import re
import shutil
from rest_framework.views import APIView
from rest_framework.response import Response #handle error
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.authtoken.models import Token
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.exceptions import ValidationError
from rest_framework.generics import DestroyAPIView
from rest_framework import generics, filters
from rest_framework.pagination import PageNumberPagination

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.decorators.http import require_GET
from django.core.files.storage import default_storage
from django.core.mail import send_mail

from django.views import View
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.http import JsonResponse, FileResponse
from django.http import HttpResponse, Http404
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.utils.timezone import now 
from django.utils import timezone
from django.utils.text import slugify
from django.contrib.auth.password_validation import validate_password
from django.utils.decorators import method_decorator
from django.db import transaction

#from myapp.gmail_api import send_email
from testproject.settings import EMAIL_HOST_USER


from .models import DeletedFile, UploadedFile, File, SharedFile, Profile, Folder
from .serializers import DeletedFilesSerializer, UserSerializer, UploadedFileSerializer, UserRegistrationSerializer, FileSerializer, ProfilePictureSerializer, ProfileSerializer, FolderSerializer
from myapp.models import File, DeletedFile
from .encryption_utils import encrypt_file
from .encryption_utils import decrypt_file
from django.contrib.auth import get_user_model
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.authentication import TokenAuthentication
from django.middleware.csrf import get_token
from secrets import token_hex
import traceback
import qrcode
from io import BytesIO
from datetime import timedelta
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django_otp.decorators import otp_required
from django_otp.plugins.otp_totp.models import TOTPDevice
from django.contrib.auth import login, authenticate
import pyqrcode
from django.views.decorators.http import require_POST
import base64
import pyotp
from rest_framework.parsers import JSONParser
from django.utils.crypto import get_random_string
from django.contrib.auth.hashers import make_password
from email.mime.text import MIMEText
from googleapiclient.discovery import build
from get_gmail_credentials import get_credentials 
from .serializers import PasswordResetRequestSerializer, PasswordResetConfirmSerializer
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.core.mail import send_mail
from myapp.gmail_api import send_reset_email 
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
#from myapp.gmail_api import send_email
#from myapp.email_utils import send_mail # Import Gmail API function

import json
import logging
import uuid
import os

logger = logging.getLogger(__name__)
User = get_user_model()

# Helper to validate file ownership
def validate_file_owner(file_id, user):
    try:
        file = File.objects.get(id=file_id)
        if file.user != user:
            raise ValidationError("You are not authorized to access this file.")
        return file
    except File.DoesNotExist:
        raise ValidationError("File not found.")

@api_view(['GET'])
def shared_file_detail(request, share_link):
    try:
        shared_file = SharedFile.objects.get(share_link=share_link)
        file = shared_file.file
        return Response({
            "filename": file.filename,
            "file_url": request.build_absolute_uri(file.file.url),
            "permissions": shared_file.permissions
        })
    except SharedFile.DoesNotExist:
        return Response({"error": "Shared link not found."}, status=404)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_file(request):
    print("Share file endpoint hit")
    file_id = request.data.get('file_id')
    share_with = request.data.get('share_with')  # List of emails
    print(f"File ID: {file_id}")
    print(f"Request User: {request.user}")

    if not file_id:
        return Response({"error": "File ID is required."}, status=400)

    if not isinstance(share_with, list):
        return Response({"error": "'share_with' must be a list of emails."}, status=400)

    permissions = request.data.get('permissions', 'read')

    # Validate file
    try:
        # Check ownership explicitly
        file = File.objects.get(id=file_id)
        if file.user != request.user:
            print(f"File with ID {file_id} is not owned by user {request.user}")
            return Response({"error": "Unauthorized to access this file."}, status=403)

        print(f"File fetched successfully: {file}")
    except File.DoesNotExist:
        print(f"File with ID {file_id} not found.")
        return Response({"error": "File not found."}, status=404)

    # Share file with each user
    share_links = []
    for email in share_with:
        shared_file = SharedFile.objects.create(
            file=file,
            shared_with=email,
            permissions=permissions
        )
        share_link = request.build_absolute_uri(
            reverse('shared_file_detail', kwargs={'share_link': shared_file.share_link})
        )
        share_links.append({
            "shared_with": email,
            "share_link": share_link,
            "permissions": permissions
        })

    return Response({"file_id": file_id, "share_links": share_links}, status=201)

# File Sharing API
class ShareFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        try:
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)

            # Mock share logic (e.g., generating a shareable link)
            share_link = f"http://example.com/share/{file_id}"

            return Response({"message": "File shared successfully.", "share_link": share_link}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

# File & folder Upload
class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            uploaded_files = request.FILES.getlist('files')
            folder_paths = request.data.getlist('folders', [])
            user_id = request.user.id

            # Handle folder creation
            parent_folder = None
            for folder_path in folder_paths:
                folder_hierarchy = folder_path.split('/')
                for folder_name in folder_hierarchy:
                    parent_folder, _ = Folder.objects.get_or_create(
                        name=folder_name,
                        parent_folder=parent_folder,
                        user_id=user_id
                    )

            # Handle file uploads
            if not uploaded_files and folder_paths:
                return Response({"message": "Folders uploaded successfully!"}, status=201)

            # Allowed file extensions and max size
            allowed_extensions = {'jpg', 'jpeg', 'png', 'pdf', 'txt', 'docx', 'xlsx', 'csv', 'zip'}
            max_size = 20 * 1024 * 1024  # 20 MB

            uploaded_file_data = []

            for uploaded_file in uploaded_files:
                file_extension = uploaded_file.name.split('.')[-1].lower()
                if file_extension not in allowed_extensions:
                    return Response({"error": f"Invalid file type: {uploaded_file.name}"}, status=400)
                if uploaded_file.size > max_size:
                    return Response({"error": f"File size exceeds 20MB: {uploaded_file.name}"}, status=400)

                relative_path = request.data.get(f"relative_path_{uploaded_file.name}", uploaded_file.name)
                folder_structure = os.path.dirname(relative_path)

                # Create folder structure if necessary
                parent_folder = None
                if folder_structure:
                    for folder_name in folder_structure.split('/'):
                        parent_folder, _ = Folder.objects.get_or_create(
                            name=folder_name,
                            parent_folder=parent_folder,
                            user_id=user_id
                        )

                # Check if the file already exists
                existing_file = File.objects.filter(
                    file=f"uploads/{relative_path}",
                    user_id=user_id,
                    folder=parent_folder
                ).first()

                if existing_file:
                    continue  # Skip already existing files to prevent duplication

                # Save the uploaded file
                base_upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
                target_folder = os.path.join(base_upload_dir, os.path.dirname(relative_path))
                os.makedirs(target_folder, exist_ok=True)

                safe_file_name = f"{slugify(os.path.basename(relative_path))}.{file_extension}"
                file_path = os.path.join(target_folder, safe_file_name)
                with open(file_path, 'wb+') as destination:
                    for chunk in uploaded_file.chunks():
                        destination.write(chunk)

                # Save file metadata
                file_instance = File.objects.create(
                    file=f"uploads/{relative_path}",
                    file_name=uploaded_file.name,
                    size=uploaded_file.size,
                    user_id=user_id,
                    folder=parent_folder
                )

                uploaded_file_data.append({
                    "file_id": file_instance.id,
                    "file_name": file_instance.file_name
                })

            return Response({
                "message": "Files and folders uploaded successfully!",
                "files": uploaded_file_data
            }, status=201)

        except Exception as e:
            print("Upload Error:", str(e))
            return Response({"error": str(e)}, status=500)

# ViewSet for files
class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user, is_deleted=False)

# List user-uploaded files
class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        files = File.objects.filter(user_id=request.user.id)
        serializer = FileSerializer(files, many=True)
        return Response(serializer.data)

class FolderListView(APIView):
    def get(self, request):
        def serialize_folder(folder):
            return {
                "id": folder.id,
                "name": folder.name,
                "children": [
                    serialize_folder(child) for child in Folder.objects.filter(parent_folder=folder)
                ]
            }
        
        folders = Folder.objects.filter(parent_folder=None)  # Top-level folders
        files = File.objects.all()
        
        return Response({
            "folders": [serialize_folder(folder) for folder in folders],
            "files": [{"id": f.id, "name": f.name, "folder_id": f.folder.id, "size": f.size} for f in files],
        })

#create folder    
@method_decorator(csrf_exempt, name='dispatch')
class FolderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        print("Request Data:", request.data)  # Debugging
        serializer = FolderSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        print("Validation Errors:", serializer.errors)  # Debugging
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FolderViewSet(viewsets.ModelViewSet):
    queryset = Folder.objects.all()
    serializer_class = FolderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class FolderContentView(APIView):
    def get(self, request, folder_id, *args, **kwargs):
        try:
            folder = Folder.objects.get(id=folder_id)
            files = folder.files.all()
            subfolders = folder.subfolders.all()

            data = {
                'files': [{'id': file.id, 'name': file.name, 'type': 'file'} for file in files],
                'subfolders': [{'id': subfolder.id, 'name': subfolder.name, 'type': 'folder'} for subfolder in subfolders],
            }
            return Response(data)
        except Folder.DoesNotExist:
            return Response({'error': 'Folder not found'}, status=404)

class FolderListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Fetch folders and files
        folders = Folder.objects.filter(user=request.user)
        files = File.objects.filter(user_id=request.user.id, is_deleted=False)

        folder_serializer = FolderSerializer(folders, many=True)
        file_serializer = FileSerializer(files, many=True)

        # Combine both folders and files in one response
        return Response({
            'folders': folder_serializer.data,
            'files': file_serializer.data
        })

# User Authentication and login
class CustomAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(
            username=request.data.get('username'),
            password=request.data.get('password')
        )
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"token": token.key})
        return Response({"error": "Invalid credentials"}, status=400)

#password reset 
@api_view(['POST'])
@permission_classes([])  # You can specify permissions if needed
def password_reset_request(request):
    """Send a password reset email via Gmail API."""
    email = request.data.get('email')  # Use request.data for JSON requests
    try:
        user = User.objects.get(email=email)  # Find the user by email
        token = default_token_generator.make_token(user)  # Generate a reset token
        uid = urlsafe_base64_encode(force_bytes(user.pk))  # Properly encode user ID
        reset_url = f'http://localhost:4200/reset-password/{uid}/{token}/'  # Construct the reset URL

        # Send the email with the reset link
        send_reset_email(user.email, reset_url)

        # Send a JSON response
        return Response({"message": "Password reset email sent successfully"}, status=200)

    except User.DoesNotExist:
        # Send a JSON response for error
        return Response({"error": "Email address not found"}, status=404)

@api_view(['POST'])
@permission_classes([])  # Update if permissions are required
def password_reset_confirm(request, token):
    """
    Handles password reset confirmation.
    """
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            # Decode the token and get user
            uid = urlsafe_base64_decode(token.split('-')[0]).decode()
            user = User.objects.get(pk=uid)

            # Validate token
            if not default_token_generator.check_token(user, token.split('-')[1]):
                return Response({"error": "Invalid or expired token."}, status=400)

            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()

            return Response({"success": "Password has been reset."})
        except Exception as e:
            return Response({"error": "Invalid token or user not found."}, status=400)
    return Response(serializer.errors, status=400)

# Profile View
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        # Retrieve the user's profile
        profile = request.user.profile

        # Serialize the user's profile data (including profile_picture)
        serializer = ProfileSerializer(profile)

        # Return the serialized profile data
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        # Get the user's profile
        profile = request.user.profile
        user = request.user
        
        # Update basic user fields
        user.first_name = request.data.get('first_name', user.first_name)
        user.last_name = request.data.get('last_name', user.last_name)
        user.email = request.data.get('email', user.email)

        # Generate OTP secret if not already set
        if not profile.otp_secret:
            import pyotp
            profile.otp_secret = pyotp.random_base32()
            profile.save()

        # Check if a profile picture is being uploaded
        if 'profile_picture' in request.FILES:
            profile.profile_picture = request.FILES['profile_picture']  # Save the uploaded picture
            profile.save()

        user.save()  # Save the user model
        
        return Response({"message": "Profile updated successfully"}, status=status.HTTP_200_OK)
    
# User Registration
class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Generate and save the OTP secret
            profile = user.profile  # Assuming the Profile is created via signal or manually
            profile.otp_secret = pyotp.random_base32()
            profile.save()

            token, _ = Token.objects.get_or_create(user=user)
            return Response({"message": "User registered successfully", "token": token.key}, status=201)
        return Response(serializer.errors, status=400)

class RenameFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        try:
            # Validate Content-Type
            if request.content_type != 'application/json':
                return Response({"error": "Content-Type must be application/json."}, status=400)

            # Validate name field
            new_name = request.data.get('name', '').strip()
            if not new_name:  # Empty name check
                return Response({"error": "File name cannot be empty."}, status=400)

            # Validate file name format
            if not re.match(r'^[a-zA-Z0-9_\- ]+$', new_name):
                return Response({"error": "Invalid file name format."}, status=400)

            # Retrieve file instance
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)
            file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', os.path.basename(file_instance.file.name))

            # Check if the file exists
            if not os.path.exists(file_path):
                return Response({"error": "File not found."}, status=404)

            # Generate new file path
            file_extension = os.path.splitext(file_instance.file.name)[1]
            new_file_name = slugify(new_name) + file_extension
            new_file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', new_file_name)

            # Check duplicate name
            if os.path.exists(new_file_path):
                return Response({"error": "File with this name already exists."}, status=400)

            # Rename the file physically and in the database
            os.rename(file_path, new_file_path)
            file_instance.file_name = new_name
            file_instance.file = f"uploads/{new_file_name}"
            file_instance.save()

            return Response({"message": "File renamed successfully."}, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

# File Download API
class DownloadFileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file = get_object_or_404(File, id=file_id, user_id=request.user.id)

            # Check the actual file path
            file_path = file.file.path
            if not os.path.exists(file_path):
                return Response({"error": "File not found."}, status=404)

            # Decrypt the file
            decrypt_file(file_path)

            # Stream file response
            response = FileResponse(open(file_path, 'rb'))
            response['Content-Disposition'] = f'attachment; filename="{file.file_name}"'

            # Re-encrypt after sending
           # encrypt_file(file_path)

            return response

        except File.DoesNotExist:
            return Response({"error": "File not found."}, status=404)
        except Exception as e:
            print(f"Download error: {str(e)}")
            return Response({"error": str(e)}, status=500)

# update new
@require_GET
def get_settings(request):
    # Replace with actual user settings logic
    settings_data = {
        'username': 'example_user',
        'email': 'example@example.com',
        'language': 'en',
    }
    return JsonResponse(settings_data)

@csrf_exempt
def update_username(request):
    if request.method == 'PUT':
        data = json.loads(request.body)
        new_username = data.get('username')
        # Replace with actual logic to update username
        return JsonResponse({'message': f'Username updated to {new_username}'})
    return JsonResponse({'error': 'Invalid request'}, status=400)
    
@api_view(['GET'])
def profile_view(request):
    user = request.user
    profile_data = {
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        # Add more profile data if needed
    }
    return Response(profile_data)

#show file delete at bin
class DeletedFilesView(APIView):
    permission_classes = [IsAuthenticated]

    # GET method - Fetch deleted files for the user
    def get(self, request):
        deleted_files = DeletedFile.objects.filter(user_id=request.user.id)
        serializer = DeletedFilesSerializer(deleted_files, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST method - Move file to trash
    def post(self, request):
        file_id = request.data.get('file_id')
        if not file_id:
            return Response({"error": "File ID is required."}, status=400)

        try:
            # Fetch the file object
            file = File.objects.get(id=file_id, user_id=request.user.id)

            # Define source and trash paths
            original_path = file.file.path  # Original path
            trash_dir = os.path.join(settings.MEDIA_ROOT, 'uploads', 'trash')  # Trash directory
            os.makedirs(trash_dir, exist_ok=True)  # Ensure trash exists

            # Move file to trash folder
            trash_path = os.path.join(trash_dir, os.path.basename(original_path))
            if os.path.exists(original_path):
                shutil.move(original_path, trash_path)  # Move file physically

            else:
                return Response({"error": "File not found in uploads directory."}, status=404)

            # Save to DeletedFile model
            deleted_file = DeletedFile.objects.create(
                id=file.id,  # Use the same ID
                file=f"uploads/trash/{os.path.basename(file.file.name)}",  # Relative path
                file_name=file.file_name,
                size=file.size,
                user_id=request.user.id,
                deleted_at=timezone.now()
        
            )

            # Remove from active files
            file.delete()

            return Response({"message": "File moved to trash successfully."}, status=200)

        except File.DoesNotExist:
            return Response({"error": "File not found."}, status=404)

        except Exception as e:
            # Rollback: Move the file back if error occurs
            if 'trash_path' in locals() and os.path.exists(trash_path):
                shutil.move(trash_path, original_path)
            return Response({"error": str(e)}, status=500)

# File Delete API
class DeleteFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        try:
            # Fetch the file instance
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)

            # Resolve the file path
            file_path = file_instance.file.path
            if not os.path.exists(file_path):
                return Response({"error": "File not found."}, status=404)

            # Move file to trash
            trash_dir = os.path.join(settings.MEDIA_ROOT, 'trash')
            os.makedirs(trash_dir, exist_ok=True)
            trash_path = os.path.join(trash_dir, os.path.basename(file_path))
            os.rename(file_path, trash_path)

            # Add file metadata to DeletedFile table
            DeletedFile.objects.create(
                file=trash_path,
                user_id=request.user.id,
                file_name=file_instance.file_name,
                deleted_at=timezone.now(),
                size=file_instance.size
            )

            # Force delete the file instance (Fallback method)
            File.objects.filter(id=file_instance.id).delete()

            # Confirm file is removed from DB
            if File.objects.filter(id=file_instance.id).exists():
                raise Exception("File record was not deleted properly.")

            return Response({"message": "File moved to trash successfully."}, status=200)

        except Exception as e:
            print(f"Delete error: {str(e)}")
            return Response({"error": str(e)}, status=500)

# File Restore API
class RestoreFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Retrieve file IDs from request
            file_ids = request.data.get('file_ids', [])

            if not file_ids:
                return Response({"error": "No file IDs provided."}, status=400)

            restored_files = []
            failed_files = []

            for file_id in file_ids:
                try:
                    # Fetch file metadata
                    deleted_file = get_object_or_404(DeletedFile, id=file_id, user_id=request.user.id)

                    # Move file back from trash
                    trash_path = deleted_file.file
                    restore_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
                    restored_path = os.path.join(restore_dir, os.path.basename(trash_path))
                    os.rename(trash_path, restored_path)

                    # Restore to File table
                    restored_file = File.objects.create(
                        file=f'uploads/{os.path.basename(restored_path)}',
                        user_id=request.user.id,
                        file_name=deleted_file.file_name,
                        size=deleted_file.size
                    )

                    # Remove from DeletedFile table
                    deleted_file.delete()
                    restored_files.append(restored_file.file_name)

                except Exception as e:
                    failed_files.append({"file_id": file_id, "error": str(e)})

            # Return results
            return Response({
                "restored": restored_files,
                "failed": failed_files
            }, status=200)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

#permenently delete
class PermanentlyDeleteFilesView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        try:
            # Single file deletion by ID
            file_id = kwargs.get('id')
            if file_id:
                # Check if file exists
                deleted_file = get_object_or_404(DeletedFile, id=file_id, user_id=request.user.id)

                # Remove the physical file from the file system
                if os.path.exists(deleted_file.file):
                    os.remove(deleted_file.file)  # Delete file from storage

                # Remove the record from DeletedFile table
                deleted_file.delete()
                return Response({"message": "File permanently deleted."}, status=200)

            # Bulk deletion by IDs from request body
            file_ids = request.data.get('file_ids', [])
            if file_ids:
                deleted_files = DeletedFile.objects.filter(id__in=file_ids, user_id=request.user.id)
                if not deleted_files.exists():
                    return Response({"error": "No valid files found to delete."}, status=404)

                # Delete each file from storage
                for file in deleted_files:
                    if os.path.exists(file.file):
                        os.remove(file.file)

                # Delete records from DeletedFile table
                deleted_files.delete()
                return Response({"message": f"{len(file_ids)} files permanently deleted."}, status=200)

            return Response({"error": "File ID(s) are required."}, status=400)

        except Exception as e:
            return Response({"error": str(e)}, status=500)

#empty bin
class EmptyTrashView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        try:
            # Fetch all deleted files for the user
            deleted_files = DeletedFile.objects.filter(user_id=request.user.id)
            if not deleted_files.exists():
                return Response({"message": "Trash is already empty."}, status=status.HTTP_200_OK)

            # Remove files from the file system
            for deleted_file in deleted_files:
                if os.path.exists(deleted_file.file):
                    os.remove(deleted_file.file)  # Physically delete the file

            # Delete records from database
            deleted_files.delete()

            return Response({"message": "Trash emptied successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            # Catch any unexpected errors
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# star file
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def starred_files(request):
    if request.method == 'GET':
        # Fetch all starred files for the user
        files = File.objects.filter(user_id=request.user.id, is_starred=True)
        serializer = FileSerializer(files, many=True)
        return Response(serializer.data)

    if request.method == 'POST':
        # Toggle the starred status of a file
        file_id = request.data.get('file_id')
        if not file_id:
            return Response({"error": "File ID is required."}, status=400)
        
        try:
            file = File.objects.get(id=file_id, user=request.user)
            file.is_starred = not file.is_starred  # Toggle the starred status
            file.save()
            return Response({
                "message": f"File '{file.file_name}' starred status updated.",
                "is_starred": file.is_starred
            })
        except File.DoesNotExist:
            return Response({"error": "File not found or not owned by the user."}, status=404)

@csrf_exempt        
def toggle_star(request, id):
    try:
        # Retrieve the file by ID
        file = File.objects.get(id=id)
        
        # Toggle the 'is_starred' status
        file.is_starred = not file.is_starred
        file.save()

        return JsonResponse({'success': True, 'is_starred': file.is_starred})
    except File.DoesNotExist:
        return JsonResponse({'error': 'File not found'}, status=404)

class FileView(View):
    def get(self, request, file_id):
        try:
            # Retrieve the file instance from the database
            file = File.objects.get(id=file_id)
            
            # Check if the 'file_path' attribute is set and has a file
            if not file.file_path or not file.file_path.name:
                return HttpResponse("File not found", status=404)

            # Get the file path, based on the file's location in the `uploads` directory
            file_path = file.file_path.path  # This gets the absolute path of the file

            # Check if the file exists at the given path
            if os.path.exists(file_path):
                # Return the file as an attachment for download
                response = FileResponse(open(file_path, 'rb'), as_attachment=True)
                return response
            else:
                return HttpResponse("File not found", status=404)
        except File.DoesNotExist:
            return HttpResponse("File not found", status=404)
        
def serve_file(request, file_id):
    file = File.objects.get(id=file_id)  # Retrieve the file object from the DB
    file_path = os.path.join(settings.MEDIA_ROOT, file.file_path.name)  # Full path to the file

    if os.path.exists(file_path):  # Check if the file exists on the filesystem
        return FileResponse(open(file_path, 'rb'))  # Serve the file
    else:
        raise Http404("File not found.")  # Return 404 if the file doesn't exist
    
@csrf_exempt
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    try:
        if request.method == 'PUT':
            # Log incoming request
            print("Incoming request data:", request.body)

            # Parse request body
            data = json.loads(request.body)

            # Access the authenticated user
            user = request.user

            # Update fields (example: username, first_name, last_name)
            if 'username' in data:
                print(f"Updating username to: {data['username']}")
                user.username = data['username']
            if 'first_name' in data:
                print(f"Updating first name to: {data['first_name']}")
                user.first_name = data['first_name']
            if 'last_name' in data:
                print(f"Updating last name to: {data['last_name']}")
                user.last_name = data['last_name']

            # Save the updated user
            user.save()
            print("User saved successfully.")

            # Return success response
            return JsonResponse({
                'message': 'Profile updated successfully',
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }, status=200)

    except json.JSONDecodeError:
        print("Error: Invalid JSON format")
        return JsonResponse({'error': 'Invalid JSON format'}, status=400)

    except Exception as e:
        print(f"Unhandled exception: {e}")
        return JsonResponse({'error': str(e)}, status=500)

    # Return 405 if method is not PUT
    return JsonResponse({'error': 'Method not allowed'}, status=405)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_profile_picture(request):
    if request.method == "POST":
        logger.debug(f"FILES: {request.FILES}")
        if 'profile_picture' in request.FILES:
            file = request.FILES['profile_picture']
            logger.debug(f"Received file: {file.name}")
            # Further file handling logic
            return JsonResponse({"message": "File uploaded successfully"}, status=200)
        else:
            logger.error("No file provided")
            return JsonResponse({"error": "No file provided"}, status=400)
        
class UploadProfilePictureView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        if 'file' not in request.FILES:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        profile_picture = request.FILES['file']
        user_profile = request.user.profile
        user_profile.profile_picture = profile_picture
        user_profile.save()

        # Generate the full URL for the uploaded profile picture
        profile_picture_url = f"{settings.MEDIA_URL}{user_profile.profile_picture}"

        return Response(
            {"message": "Profile picture uploaded successfully", "profile_picture_url": profile_picture_url},
            status=status.HTTP_200_OK
        )

# Define pagination first
class FileSearchPagination(PageNumberPagination):
    page_size = 10  # Number of results per page
    page_size_query_param = 'page_size'
    max_page_size = 50

#search function
class FileSearchView(generics.ListAPIView):
    serializer_class = FileSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['file_name', 'file_path']
    pagination_class = FileSearchPagination

    def get_queryset(self):
        query = self.request.query_params.get('search', '')
        print(f"Received Search Query: {query}")  # Debugging log
        if query:
            # Filter and order by created_at descending
            return File.objects.filter(
                file_name__icontains=query,
                is_deleted=False
            ).order_by('-created_at')  # Explicit ordering by latest created_at
        return File.objects.none()

#file preview
class FileMetadataView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)
            file_path = file_instance.file.path
            file_size = os.path.getsize(file_path)
            file_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

            return Response({
                "file_name": file_instance.file_name,
                "url": request.build_absolute_uri(file_instance.file.url),
                "type": file_type,
                "size": file_size,
            }, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class FilePreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, file_id):
        try:
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)
            file_path = file_instance.file.path

            # Decrypt or Copy the file
            decrypted_file_path = file_path + ".decrypted"
            decrypt_file(file_path, decrypted_file_path)

            # Serve the decrypted file
            response = FileResponse(open(decrypted_file_path, 'rb'))
            response['Content-Type'] = mimetypes.guess_type(decrypted_file_path)[0]
            response['Content-Disposition'] = f'inline; filename="{file_instance.file_name}"'

            # Cleanup
            os.remove(decrypted_file_path)
            return response

        except Exception as e:
            logger.error(f"File preview error: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=500)

#change password
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        data = request.data

        # Get passwords from request
        old_password = data.get("old_password")
        new_password = data.get("new_password")
        confirm_password = data.get("confirm_password")

        # Check if old password is correct
        if not user.check_password(old_password):
            return Response({"error": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if new passwords match
        if new_password != confirm_password:
            return Response({"error": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        # Validate new password
        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response({"error": e.messages}, status=status.HTTP_400_BAD_REQUEST)

        # Set new password
        user.set_password(new_password)
        user.save()

        return Response({"message": "Password changed successfully."}, status=status.HTTP_200_OK)

#Delete Account
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user

        # Remove associated profile picture if exists
        profile = user.profile  # Assuming User has a related Profile model
        if profile.profile_picture:
            profile_picture_path = profile.profile_picture.path
            if os.path.exists(profile_picture_path):
                os.remove(profile_picture_path)

        # Delete the user and related data
        user.delete()

        return Response({"message": "Account deleted successfully"}, status=status.HTTP_200_OK)

# sharing files with specific users
class ShareFileView(View):
    @method_decorator(csrf_exempt, name='dispatch')
    def post(self, request, *args, **kwargs):

        try:
            data = json.loads(request.body)
            file_id = data.get('fileId')
            email = data.get('email')

            file = File.objects.get(id=file_id)
            shared_with_user = User.objects.get(email=email)
            shared_by_user = request.user

            SharedFile.objects.create(file=file, shared_with=shared_with_user, shared_by=shared_by_user)

            send_mail(
                'File Shared with You',
                f'{shared_by_user.username} has shared a file with you. File: {file.name}',
                'noreply@yourapp.com',
                [email],
            )

        
            return JsonResponse({'message': 'File shared successfully!'}, status=200)

        except File.DoesNotExist:
            return JsonResponse({'error': 'File not found'}, status=404)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
        
    def get(self, request, *args, **kwargs):
        return JsonResponse({'error': 'GET method not allowed for this endpoint'}, status=405)
    
@csrf_exempt      
def share_file(request):
    if request.method == 'POST':
        data = json.loads(request.body)  # Parse the JSON data
        file_id = data.get('fileId')  # Correct key to match the frontend payload
        email = data.get('email')

        try:
            # Find the file and user
            file = File.objects.get(id=file_id)
            shared_with_user = User.objects.get(email=email)
            shared_by_user = request.user

            # Create a shared file entry
            SharedFile.objects.create(file=file, shared_with=shared_with_user, shared_by=shared_by_user)

            # Send email notification
            send_mail(
                'File Shared with You',
                f'{shared_by_user.username} has shared a file with you. File: {file.name}',
                'noreply@yourapp.com',
                [email],
            )

            return JsonResponse({'message': 'File shared successfully!'}, status=200)
        except File.DoesNotExist:
            return JsonResponse({'error': 'File not found'}, status=404)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Invalid HTTP method'}, status=405)

def custom_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            request.session['pre_2fa_user_id'] = user.id
            return redirect('verify_2fa')
    return render(request, 'login.html')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_2fa(request):
    try:
        data = request.data
        otp = data.get('otp')
        
        if not otp:
            logger.error("No OTP provided in request")
            return JsonResponse({'error': 'OTP is required'}, status=400)

        # Log the received OTP
        logger.info(f"Received OTP: {otp}")

        user = request.user
        base32_secret = user.profile.otp_secret
        
        if not base32_secret:
            logger.error("No OTP secret available for the user")
            return JsonResponse({'error': 'No OTP secret configured'}, status=400)

        # Log the secret being used
        logger.info(f"Using secret: {base32_secret}")

        totp = pyotp.TOTP(base32_secret)

        # Generate the current OTP on the server and log it
        server_otp = totp.now()
        logger.info(f"Generated OTP on Server: {server_otp}")

        # Validate the received OTP
        if totp.verify(otp, valid_window=1):  # ±30 seconds drift allowed
            logger.info("OTP is valid")
            return JsonResponse({'success': True, 'message': '2FA verified successfully'})
        else:
            logger.error("Invalid OTP provided")
            return JsonResponse({'error': 'Invalid OTP'}, status=400)

    except Exception as e:
        logger.error("Error during OTP verification", exc_info=True)
        return JsonResponse({'error': 'Server error'}, status=500)



#@api_view(['POST'])
#@permission_classes([IsAuthenticated])
#def setup_2fa(request):
 #   user = request.user
  #  device, created = TOTPDevice.objects.get_or_create(user=user, name='default')

   # if created:
    #    device.save()

 #   qr_code_url = device.config_url

    # Generate QR Code
 #   qr = qrcode.make(qr_code_url)
  #  buffer = BytesIO()
   # qr.save(buffer, format='PNG')
 #   base64_image = b64encode(buffer.getvalue()).decode()

  #  return JsonResponse({"qr_code": f"data:image/png;base64,{base64_image}"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_2fa(request):
    user = request.user
    profile = user.profile

    if not profile.otp_secret:
        profile.otp_secret = pyotp.random_base32()  # Generate Base32 secret
        profile.save()

    base32_secret = profile.otp_secret

    otp_url = pyotp.totp.TOTP(base32_secret).provisioning_uri(
        name=user.username,
        issuer_name="MyApp"  # Replace with your app's name
    )

    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(otp_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')

    return JsonResponse({
        "qr_code": f"data:image/png;base64,{img_str}",
        "otp_url": otp_url,
        "secret": base32_secret  # Optional for manual setup
    })


class Enable2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Get the user's profile
        profile = request.user.profile

        # Check if OTP secret already exists
        if not profile.otp_secret:
            # Generate and save OTP secret
            profile.otp_secret = pyotp.random_base32()
            profile.save()

        # Return the secret to the user to display QR code
        return Response({"otp_secret": profile.otp_secret}, status=status.HTTP_200_OK)
    
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
    instance.profile.save()


#testing email
def send_test_email(request):
    """Django view to send a test email."""
    try:
        to_email = 'recipient@example.com'
        subject = 'Test Email from Django'
        body = 'This is a test email sent via the Gmail API.'

        # Send the email
        result = send_email(to_email, subject, body)

        return JsonResponse({'status': 'success', 'message': result})
    except Exception as e:
        return JsonResponse({'status': 'error', 'message': str(e)})
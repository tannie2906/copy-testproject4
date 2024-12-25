from datetime import timezone
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

from django.views import View
from django.contrib.auth import authenticate
from django.http import JsonResponse, FileResponse
from django.http import HttpResponse, Http404
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.utils.timezone import now 
from django.utils import timezone
from django.utils.text import slugify


from .models import DeletedFile, UploadedFile, File, SharedFile, Profile
from .serializers import DeletedFilesSerializer, UserSerializer, UploadedFileSerializer, UserRegistrationSerializer, FileSerializer, ProfilePictureSerializer, ProfileSerializer
from myapp.models import File, DeletedFile
from .encryption_utils import encrypt_file
from .encryption_utils import decrypt_file

import json
import logging
import uuid
import os


logger = logging.getLogger(__name__)

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

# File Upload
class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Extract uploaded file and metadata
            uploaded_file = request.FILES.get('file')
            file_name = request.data.get('name', '').strip()
            user_id = request.user.id

            # Validation: Check if file and name are provided
            if not uploaded_file:
                return Response({"error": "No file uploaded."}, status=400)
            if not file_name:
                return Response({"error": "File name is required."}, status=400)

            # Validation: File size and type restrictions
            allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf']
            max_size = 5 * 1024 * 1024  # 5 MB

            file_extension = uploaded_file.name.split('.')[-1].lower()
            if file_extension not in allowed_extensions:
                return Response({"error": "Invalid file type."}, status=400)
            if uploaded_file.size > max_size:
                return Response({"error": "File size exceeds 5MB limit."}, status=400)

            # Generate safe filename and upload path
            safe_file_name = f"{slugify(file_name)}.{file_extension}"
            upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
            os.makedirs(upload_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, safe_file_name)

            # Avoid overwriting existing files
            counter = 1
            while os.path.exists(file_path):
                safe_file_name = f"{slugify(file_name)}-{user_id}-{counter}.{file_extension}"
                file_path = os.path.join(upload_dir, safe_file_name)
                counter += 1

            # Save file to disk
            with open(file_path, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)

             # Encrypt the file after saving
            encrypt_file(file_path)

            # Save metadata to database
            file_instance = File.objects.create(
                file=f"uploads/{safe_file_name}",
                file_name=file_name,
                size=uploaded_file.size,
                user_id=user_id,
            )

            return Response({
                "message": "File uploaded successfully!",
                "file_id": file_instance.id,
                "file_name": file_instance.file_name
            }, status=201)

        except ValueError as ve:
            return Response({"error": str(ve)}, status=400)
        except OSError as oe:
            return Response({"error": "File system error."}, status=500)
        except Exception as e:
            print("Upload Error:", str(e))
            return Response({"error": str(e)}, status=500)

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

# User Authentication
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
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"message": "User registered successfully", "token": token.key}, status=201)
        return Response(serializer.errors, status=400)

# Rename a file
#class FileRenameView(APIView):
 #   permission_classes = [IsAuthenticated]
  #  def post(self, request, *args, **kwargs):
   #     # Extract the file_id and new_name from the request data
    #    file_id = request.data.get('file_id')
     #   new_name = request.data.get('new_name')
        
      #  if not file_id or not new_name:
       #     return Response({"error": "file_id or new_name is missing."}, status=status.HTTP_400_BAD_REQUEST)

        # Implement file renaming logic here (e.g., rename the file in the system)
        # For now, let's assume we are simply returning the new name for demonstration.
      #  return Response({"message": f"File renamed to {new_name} successfully!"}, status=status.HTTP_200_OK)

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
            file_path = file_instance.file.path

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




# File Download
#class DownloadFileAPIView(APIView):
#    permission_classes = [IsAuthenticated]

 #   def get(self, request, file_id):
   #     try:
            # Retrieve the file record
    #        file = File.objects.get(id=file_id, user_id=request.user.id)

            # Resolve full file path
     #       file_path = file.file.path  # Path stored in the model
      #      file_name = os.path.basename(file.file.name)  # Extract filename

            # Debug logs
       #     print(f"Requested File Path: {file_path}")
        #    print(f"File Exists: {os.path.exists(file_path)}")

            # Validate physical file existence
         #   if not os.path.exists(file_path):
                # Log and return meaningful error response
          #      print(f"Error: File {file_path} not found.")
           #     return Response({"error": "File not found on server."}, status=404)

            # Serve the file as an attachment
        #    response = FileResponse(
        #        open(file_path, 'rb'),
        #        as_attachment=True,
        #        filename=file_name
         #   )
        #    return response

       # except File.DoesNotExist:
      #      print(f"Error: File ID {file_id} does not exist.")
      #      return Response({"error": "File does not exist."}, status=404)

     #   except Exception as e:
      #      print(f"Error occurred: {str(e)}")
      #      return Response({"error": f"Server error: {str(e)}"}, status=500)

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
            encrypt_file(file_path)

            return response

        except File.DoesNotExist:
            return Response({"error": "File not found."}, status=404)
        except Exception as e:
            print(f"Download error: {str(e)}")
            return Response({"error": str(e)}, status=500)


# ViewSet for files
class FileViewSet(viewsets.ModelViewSet):
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return File.objects.filter(user=self.request.user, is_deleted=False)

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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_file(request):
    if request.method == 'POST':
        file = request.FILES.get('file')  # This is the uploaded file
        size = file.size  # Get the size of the file
        user = request.user  # Assuming the user is logged in and associated with the file

        # Create the File instance, using the correct fields
        file_instance = File.objects.create(file=file, size=size, owner=user)

        # Serialize and return the response
        serializer = FileSerializer(file_instance)
        return Response(serializer.data)

def get(self, request, *args, **kwargs):
    files = File.objects.all()
    logger.info(f"Fetched files: {files}")
    serializer = FileSerializer(files, many=True)
    return Response(serializer.data)

#delete function this one same as DeletedFilesView
class FileDeleteView(APIView):
    def delete(self, request, id, *args, **kwargs):
        try:
            # Log the incoming request
            logger.info(f"File ID {id} requested for deletion by user {request.user.id}")

            # Fetch the file
            file = File.objects.get(id=id, user_id=request.user.id)

            # Log database file details
            logger.info(f"Database file path: {file.file}") 

            # Compute correct file path in the uploads directory
            original_path = file.file.path  # Path in 'uploads/' folder
            trash_dir = os.path.join(settings.MEDIA_ROOT, 'trash')  # Trash directory
            os.makedirs(trash_dir, exist_ok=True)  # Ensure trash exists

            # Move file to trash folder
            trash_path = os.path.join(trash_dir, os.path.basename(original_path))  # Full path in trash
            if os.path.exists(original_path):
                shutil.move(original_path, trash_path)  # Move file physically
                logger.info(f"File moved to trash: {trash_path}")
            else:
                logger.warning(f"File {original_path} not found in filesystem.")  # Log missing path

            # Perform soft delete (mark file as deleted in the main table)
            file.is_deleted = True
            file.save()

            # Save the deleted file record with the new path in the trash folder
            DeletedFile.objects.create(
                file=f"trash/{os.path.basename(file.file.name)}",  # Store relative path in DeletedFile
                user_id=request.user.id,
                file_name=file.file_name,
                size=file.size
            )

            # Return success response
            return Response({"message": "File deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

        except ObjectDoesNotExist:
            logger.error(f"File ID {id} not found for user {request.user.id}")
            return Response({"error": "File not found"}, status=status.HTTP_404_NOT_FOUND)

        except PermissionError as e:
            logger.error(f"Permission error for file ID {id}: {e}")
            return Response({"error": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)

        except Exception as e:
            logger.error(f"Unexpected error for file ID {id}: {e}")
            return Response({"error": f"Internal Server Error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
 
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
               # id=file.id,  # Use the same ID
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

class DeletedFileDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, id):
        try:
            deleted_file = DeletedFile.objects.get(id=id, user_id=request.user.id)

            # Construct file path
            file_path = os.path.join(settings.MEDIA_ROOT, deleted_file.file)

            # Remove file physically
            if os.path.exists(file_path):
                os.remove(file_path)

            deleted_file.delete()
            return Response({"message": "File permanently deleted."}, status=200)

        except DeletedFile.DoesNotExist:
            return Response({"error": "File not found."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

# File Delete API
class DeleteFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        try:
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id)

            # Resolve the actual file path
            file_path = file_instance.file.path
            if not os.path.exists(file_path):
                return Response({"error": "File not found."}, status=404)

            # Move file to trash
            trash_dir = os.path.join(settings.MEDIA_ROOT, 'trash')
            os.makedirs(trash_dir, exist_ok=True)
            trash_path = os.path.join(trash_dir, os.path.basename(file_path))
            os.rename(file_path, trash_path)

            # Update database
            file_instance.file = f"trash/{os.path.basename(trash_path)}"
            file_instance.is_deleted = True
            file_instance.deleted_at = timezone.now()
            file_instance.save()

            return Response({"message": "File moved to trash."}, status=200)

        except Exception as e:
            print(f"Delete error: {str(e)}")
            return Response({"error": str(e)}, status=500)

        
#@csrf_exempt
#@api_view(['DELETE'])
#@permission_classes([IsAuthenticated])
#def delete_file(request, id):
 #   try:
  #      # Retrieve the file to be deleted
   #     file = File.objects.get(id=id, user_id=request.user.id)

#        # Ensure file exists and can be deleted
 #       if not file.file or file.file == "0":
  #          return JsonResponse({"error": "File record is corrupted."}, status=400)
#     # Move the file to the DeletedFile model
 #       deleted_file = DeletedFile.objects.create(
  #          file=file.file,
   #         file_name=file.file_name,
    #        size=file.size,
     #       user_id=request.user.id,
      #      deleted_at=timezone.now()  # Store the deletion timestamp
       # )

        #Now delete the file from the File model
        #file.delete()

       # return JsonResponse({'message': f'File {file.file_name} deleted successfully and moved to deleted files.'}, status=200)

    #except File.DoesNotExist:
     #   return JsonResponse({'error': 'File not found.'}, status=404)

#    except Exception as e:
 #       logger.error(f"Error while deleting file with ID {id}: {str(e)}")
  #      return JsonResponse({'error': 'An error occurred while deleting the file.'}, status=500)

# fetch delete file
#@api_view(['GET'])
#@permission_classes([IsAuthenticated])
#def get_deleted_files(request):
 #   try:
  #      user_id = request.user.id  # Get authenticated user's ID
   #     print(f"Authenticated user ID: {user_id}")  # Debugging log
        
        # Fetch deleted files only for the current user
    #    deleted_files = DeletedFile.objects.filter(user_id=request.user.id)

        # Serialize the data
     #   serializer = DeletedFilesSerializer(deleted_files, many=True)
        
        # Debugging: Log the query results
      #  print(f"Deleted files for user {user_id}: {deleted_files}")
        
       # return Response(serializer.data, status=200)
    #except Exception as e:
     #   return Response({"error": str(e)}, status=500)
    
# Restore deleted files
#class RestoreFileView(APIView):
 #   permission_classes = [IsAuthenticated]

  #  def post(self, request):
   #     try:
    #        # 1. Get file IDs
     #       file_ids = request.data.get('file_ids', [])
      #      if not file_ids:
       #         return Response({"error": "File IDs are required."}, status=400)

        #    restored_files = []
        #    failed_files = []

            # 2. Process each file
         #   for file_id in file_ids:
          #      try:
                    # 3. Retrieve deleted file
           #         deleted_file = DeletedFile.objects.get(id=file_id, user_id=request.user.id)

                    # 4. Paths
            #        trash_path = os.path.join(settings.MEDIA_ROOT, 'uploads', 'trash', os.path.basename(File.file.name))

                    # Extract original file name
             #       filename = os.path.basename(deleted_file.file)

                    # Ensure no double 'uploads/' prefix
              #      if deleted_file.file.startswith("uploads/"):
               #         restore_path = os.path.join(settings.MEDIA_ROOT, deleted_file.file)
                #        db_path = deleted_file.file  # Preserve original DB path
                 #   else:
                  #      restore_path = os.path.join(settings.MEDIA_ROOT, 'uploads', filename)
                   #     db_path = f"uploads/{filename}"  # Always prepend uploads/

                    # Debug logs
                   # print(f"Restoring file: {trash_path} -> {restore_path}")
                  #  print(f"Database path: {db_path}")

                    # 5. Ensure directory exists
                  #  os.makedirs(os.path.dirname(restore_path), exist_ok=True)

                    # 6. Move file
                   # shutil.move(trash_path, restore_path)

                    # 7. Save to File table with correct path
                  #  restored_file = File.objects.create(
                   #     id=deleted_file.id,
                    #    file=db_path,  # Use dynamic db_path
                     #   file_name=deleted_file.file_name,
                      #  size=deleted_file.size,
                       # user_id=request.user.id,
                      #  is_deleted=False,
                       # created_at=timezone.now()
                    #)

                    # 8. Remove from deleted table
                   # deleted_file.delete()
                  #  restored_files.append(file_id)

               # except DeletedFile.DoesNotExist:
                #    failed_files.append({"file_id": file_id, "error": "File not found."})
              #  except Exception as e:
               #     failed_files.append({"file_id": file_id, "error": str(e)})

            # 9. Response
          #  return Response({
          #      "message": "Restore process completed.",
          #      "restored": restored_files,
          #      "failed": failed_files
         #   }, status=200)

      #  except Exception as e:
      #      return Response({"error": str(e)}, status=500)

# File Restore API
class RestoreFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, file_id):
        try:
            file_instance = get_object_or_404(File, id=file_id, user_id=request.user.id, is_deleted=True)

            # Restore file from trash
            trash_dir = os.path.join(settings.MEDIA_ROOT, 'trash')
            original_path = os.path.join(settings.MEDIA_ROOT, file_instance.file)
            trash_path = os.path.join(trash_dir, os.path.basename(file_instance.file))

            os.rename(trash_path, original_path)
            file_instance.is_deleted = False
            file_instance.deleted_at = None
            file_instance.save()

            return Response({"message": "File restored successfully."}, status=200)
        except Exception as e:
            return Response({"error": str(e)}, status=500)    

#@api_view(['DELETE'])
#@permission_classes([IsAuthenticated])
#def permanently_delete(request, id):
 #   deleted_file = get_object_or_404(DeletedFile, id=id)
  #  deleted_file.delete()
   # return Response({"message": "File permanently deleted."}, status=200)

#permenently delete
class PermanentlyDeleteFilesView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        file_id = kwargs.get('id')  # Get 'id' from the URL
        if not file_id:
            return Response({"error": "File ID is required."}, status=400)

        deleted_files = DeletedFile.objects.filter(id=file_id, user_id=request.user.id)
        if not deleted_files.exists():
            return Response({"error": "No valid file found to delete."}, status=404)

        deleted_files.delete()
        return Response({"message": "File permanently deleted."}, status=200)

#empty bin
class EmptyTrashView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        # Delete all the files in the trash for the authenticated user
        DeletedFile.objects.filter(user_id=request.user.id).delete()
        return Response({"message": "Trash emptied successfully."}, status=status.HTTP_200_OK)

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
        print("Received request at UploadProfilePictureView")  # Debug message
        print(f"Request FILES: {request.FILES}")
        print(f"Request DATA: {request.data}")

        if 'file' not in request.FILES:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        profile_picture = request.FILES['file']
        print(f"File name: {profile_picture.name}")

        # Get the user's profile (assuming the logged-in user has a profile model)
        user_profile = request.user.profile  # Get the profile of the logged-in user
        user_profile.profile_picture = profile_picture  # Save the uploaded picture
        user_profile.save()  # Save to the database

        return Response({"message": "Profile picture uploaded successfully"}, status=status.HTTP_200_OK)

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

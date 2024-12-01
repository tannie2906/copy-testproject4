from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view
from django.http import JsonResponse
from django.conf import settings
from django.core.files.storage import default_storage
from .models import UploadedFile
from .serializers import UserSerializer, FileSerializer, UserRegistrationSerializer, UploadedFileSerializer
from rest_framework import viewsets
from .models import File
from rest_framework import permissions, viewsets
from django.views.decorators.csrf import csrf_exempt
import json
import logging
from .models import UploadedFile 
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view, permission_classes

logger = logging.getLogger(__name__)

# File Upload
class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        name = request.data.get('name') #name file that user provide
        if not file:
            return Response({"error": "No file provided."}, status=400)
        if not name:
            name = file.name # default ori file name if name not provide
        uploaded_file = UploadedFile.objects.create(
            file=file, 
            filename=name, #make name appear as user
            owner=request.user)
        return Response({
            "message": "File uploaded successfully!", 
            "file_url": settings.MEDIA_URL + uploaded_file.file.name
        }, status=201)

class FileListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        uploaded_files = UploadedFile.objects.filter(owner=request.user)
        serializer = UploadedFileSerializer(uploaded_files, many=True)
        return Response(serializer.data)

# User Authentication
class CustomAuthToken(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)

        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"token": token.key})
        return Response({"error": "Invalid credentials"}, status=400)

class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)  # Serialize the User model directly
        return Response(serializer.data)

    def put(self, request):
        user = request.user
        data = request.data
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.email = data.get('email', user.email)
        user.save()
        return Response({"message": "Profile updated successfully"})

# Registration
class RegisterUserView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({"message": "User registered successfully", "token": token.key}, status=201)
        return Response(serializer.errors, status=400)
    

# view to retrieve only the deleted files for auth user    
class DeletedFilesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        deleted_files = UploadedFile.objects.filter(owner=request.user, is_deleted=True)
        serializer = UploadedFileSerializer(deleted_files, many=True)
        return Response(serializer.data)


# List Files
@api_view(['GET'])
def list_uploaded_files(request):
    media_path = settings.MEDIA_ROOT
    files = [file for file in os.listdir(media_path) if os.path.isfile(os.path.join(media_path, file))]
    return JsonResponse({'files': files})

#for user to look at their own file
class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [permissions.IsAuthenticated]  # Ensure the user is authenticated

    def get_queryset(self):
        # Only show files for the logged-in user
        return File.objects.filter(user=self.request.user)
    
@csrf_exempt
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def rename_file(request, file_id):
    try:
        data = json.loads(request.body)
        new_name = data.get('newName')

        if not new_name:
            return JsonResponse({'error': 'New name is required.'}, status=400)

        file = UploadedFile.objects.get(id=file_id, owner=request.user)
        file.filename = new_name
        file.save()
        return JsonResponse({'message': 'File renamed successfully.'})

    except UploadedFile.DoesNotExist:
        return JsonResponse({'error': 'File not found or not owned by the user.'}, status=404)
    except Exception as e:
        logger.exception(f"Unhandled exception in rename_file: {e}")
        return JsonResponse({'error': f'Internal server error: {e}'}, status=500)

@csrf_exempt
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_file(request, file_id):
    try:
        file = UploadedFile.objects.get(id=file_id, owner=request.user)
        file.is_deleted = True  # Mark as deleted instead of actual deletion
        file.save()
        return JsonResponse({'message': 'File deleted successfully.'})
    except UploadedFile.DoesNotExist:
        return JsonResponse({'error': 'File not found or not owned by the user.'}, status=404)
    except Exception as e:
        logger.exception(f"Unhandled exception in delete_file: {e}")
        return JsonResponse({'error': 'Internal server error.'}, status=500)

@api_view(['GET'])
def profile_view(request):
    # This assumes you are using token authentication
    user = request.user
    profile = user.profile  # Profile linked to the user
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)

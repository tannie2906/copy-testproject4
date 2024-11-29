from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UploadedFile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['id', 'filename', 'file', 'upload_date']

class UserRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class UploadedFileSerializer(serializers.ModelSerializer):
    size = serializers.SerializerMethodField()  # Add size field
    owner = UserSerializer()  # Include owner details using the UserSerializer

    class Meta:
        model = UploadedFile
        fields = ['id', 'filename', 'file', 'upload_date', 'size', 'owner']  # Add size and owner to fields

    def get_size(self, obj):
        return obj.file.size  # Get the file size in bytes

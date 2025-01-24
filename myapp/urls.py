from django.urls import path, include
from rest_framework.routers import DefaultRouter

from myapp import admin
from .views import FileUploadView, FileListView, CustomAuthToken, ProfileView, RegisterUserView, UploadProfilePictureView,  DeletedFilesView 
#from .views import FileViewSet
from . import views
from .views import FileView, RestoreFileView, PermanentlyDeleteFilesView #DeletedFileDeleteView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    FileUploadView, FileListView, CustomAuthToken, ProfileView, RegisterUserView,
    UploadProfilePictureView, DeletedFilesView, #Setup2FA, #setup_2fa,# verify_2fa,
    RenameFileView, DeleteFileView, RestoreFileView, DownloadFileView,NotificationListView, MarkNotificationReadView,
    FilePreviewView, FileMetadataView, ChangePasswordView,
    DeleteAccountView, FolderView, FolderListView, FolderViewSet, FileSearchView,
    EmptyTrashView, FolderContentView, ShareFileView #Verify2FA, QRGeneratorView,
)
from two_factor.views import SetupView 
from .views import CustomAuthToken
from django_otp.decorators import otp_required
from . import views
from myapp.views import password_reset_request, password_reset_confirm

import django.contrib.admin as django_admin

router = DefaultRouter()
router.register(r'folders', FolderViewSet, basename='folder')


urlpatterns = [
    path('api/', include(router.urls)),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('login/', CustomAuthToken.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('token-auth/', TokenObtainPairView.as_view(), name='api_token_auth'),
    path('token-refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    

    path('verify-2fa/', views.verify_2fa, name='verify_2fa'),
    path('setup-2fa/', views.setup_2fa, name='setup_2fa'),

    path('password-reset-request', password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/<str:uidb64>/<str:token>',
    password_reset_confirm,
    name='password_reset_confirm'),

    # Admin (exclude from 2FA)
    path('admin/', django_admin.site.urls), # Correct way to include the admin site

    #path('', otp_required(views.home), name='home'),  # Apply 2FA here
   # path('admin/', include('django.contrib.admin.urls')),  # No 2FA for admin

    #update setting
    path('settings/', views.get_settings, name='get_settings'),  # GET endpoint
    path('update-username', views.update_username, name='update_username'),
    path('update-profile', views.update_profile, name='update-profile'),
    path('upload-profile-picture/', UploadProfilePictureView.as_view(), name='upload-profile-picture'),

    path('files/', FileListView.as_view(), name='file-list'),
   


    #folder page
    path('files/view/<int:file_id>/', FileView.as_view(), name='file-view'),
    path('files/starred/', views.starred_files, name='starred_files'),
    path('files/toggle-star/<int:id>/', views.toggle_star, name='toggle_star'),


    #path('delete/<int:id>/', DeletedFileDeleteView.as_view(), name='delete_file'),
    #path('files/delete/<int:id>/', FileDeleteView.as_view(), name='delete_active_file'),

    #delete page
    path('permanently-delete/<int:id>/', PermanentlyDeleteFilesView.as_view(), name='permanently_delete'),
    path('permanently-delete/', PermanentlyDeleteFilesView.as_view(), name='permanently_delete_bulk'),  # For multiple files

    path('empty-trash/', EmptyTrashView.as_view(), name='empty_trash'),
    path('deleted-files/', DeletedFilesView.as_view(), name='deleted-files'), #show list file delete

    #app component
    path('apisearch/', FileSearchView.as_view(), name='apisearch'),


    path('upload/', FileUploadView.as_view(), name='upload-file'),
    path('rename/<int:file_id>/', RenameFileView.as_view(), name='rename-file'),
    path('delete/<int:file_id>/', DeleteFileView.as_view(), name='delete-file'),
    path('restore-files/', RestoreFileView.as_view(), name='restore-files'),
    path('download/<int:file_id>/', DownloadFileView.as_view(), name='download-file'),

    #file review
    path('file-preview/<int:file_id>/', FilePreviewView.as_view(), name='file_preview'),
    path('file-metadata/<int:file_id>/', FileMetadataView.as_view(), name='file_metadata'),

    #settings page
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),


    path('folders/', views.FolderListView.as_view(), name='folder-list'),  # GET
    #path('folders/create/', views.FolderView.as_view(), name='folder-create'),  # POST
    path('folders/<int:folder_id>/', views.FolderContentView.as_view(), name='folder_list'),

   # path('upload/', UploadView.as_view(), name='upload'),
    path('folder/<int:folder_id>/', FolderContentView.as_view(), name='folder-contents'),

    path('share-file/<int:file_id>/', ShareFileView.as_view(), name='share_file'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/mark-read/<int:notification_id>/', MarkNotificationReadView.as_view(), name='mark_notification_read'),
    path('file/<int:file_id>/', FileView.as_view(), name='get_file'),
    path('folders/', views.FolderListView.as_view(), name='folder-list'),
    path('api/files/view/<int:file_id>/', FileView.as_view(), name='file-view'),
    

]

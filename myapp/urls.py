from django.urls import path, include
from rest_framework.routers import DefaultRouter

from myapp import admin
from .views import FileUploadView, CustomAuthToken, ProfileView, RegisterUserView, UploadProfilePictureView,  DeletedFilesView 
#from .views import FileViewSet
from . import views
from .views import FileView, RestoreFileView, PermanentlyDeleteFilesView #DeletedFileDeleteView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    FileUploadView, CustomAuthToken, ProfileView, RegisterUserView,
    UploadProfilePictureView, DeletedFilesView, #Setup2FA, #setup_2fa,# verify_2fa,
    RenameFileView, DeleteFileView, RestoreFileView, DownloadFileView, ChangePasswordView,
    DeleteAccountView, FolderListView, FileSearchView,
    EmptyTrashView, ShareFileView, SharedFileView #Verify2FA, QRGeneratorView,
)
from two_factor.views import SetupView 
from .views import CustomAuthToken
from django_otp.decorators import otp_required
from . import views
from myapp.views import password_reset_request, password_reset_confirm, move_to_lockbox, move_out_of_lockbox, get_locked_files, verify_lockbox_password, save_lockbox_password

import django.contrib.admin as django_admin

router = DefaultRouter()
#router.register(r'folders', FolderViewSet, basename='folder')


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

    path('password-reset-request/', password_reset_request, name='password_reset_request'),
    path('password-reset-confirm/<str:uidb64>/<str:token>',
    password_reset_confirm,
    name='password_reset_confirm'),

    # Admin (exclude from 2FA)
    path('admin/', django_admin.site.urls), # Correct way to include the admin site

    #update setting
    path('settings/', views.get_settings, name='get_settings'),  # GET endpoint
    path('update-username', views.update_username, name='update_username'),
    path('update-profile', views.update_profile, name='update-profile'),
    path('upload-profile-picture/', UploadProfilePictureView.as_view(), name='upload-profile-picture'),

    #path('files/', FileListView.as_view(), name='file-list'),
   


    #folder page
    path('files/view/<int:file_id>/', FileView.as_view(), name='file-view'),
    path('files/starred/', views.starred_files, name='starred_files'),
    path('files/toggle-star/<int:id>/', views.toggle_star, name='toggle_star'),

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

    #settings page
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),


    path('folders/', views.FolderListView.as_view(), name='folder-list'),  
    path('folders/', views.FolderListView.as_view(), name='folder-list'),

    path('share-file/<int:file_id>/', ShareFileView.as_view(), name='share_file'),
    path('shared-files/<uuid:share_token>/', SharedFileView.as_view(), name='shared_file'),
    
    path('file/<int:file_id>/', FileView.as_view(), name='get_file'),
    path('api/files/view/<int:file_id>/', FileView.as_view(), name='file-view'),

    path('lockbox/move/<int:file_id>/', move_to_lockbox, name='move_to_lockbox'),
    path('lockbox/remove/<int:file_id>/', move_out_of_lockbox, name='move_out_of_lockbox'),
    path('lockbox/files/', get_locked_files, name='get_locked_files'),
    path('lockbox/save-password/', save_lockbox_password, name='save-lockbox-password'),
    path('lockbox/verify-password/', verify_lockbox_password, name='verify-lockbox-password'),
    

]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileUploadView, FileListView, CustomAuthToken, FolderContentView, ProfileView, RegisterUserView, FileViewSet, UploadProfilePictureView,  DeletedFilesView
from .views import FileViewSet
from . import views
from .views import FileView, RestoreFileView, PermanentlyDeleteFilesView #DeletedFileDeleteView
from .views import EmptyTrashView, FileSearchView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    FileUploadView,
    RenameFileView,
    DeleteFileView,
    RestoreFileView,
    DownloadFileView,
    ShareFileView,
    FilePreviewView,
    FileMetadataView,
    ChangePasswordView,
    DeleteAccountView,
    FolderView,
    FolderListView,
    FolderViewSet
)

router = DefaultRouter()
router.register(r'files', FileViewSet, basename='file')
router.register(r'folders', FolderViewSet, basename='folder')

urlpatterns = [
    path('api/', include(router.urls)),
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('login/', CustomAuthToken.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('register/', RegisterUserView.as_view(), name='register'),
    path('token-auth/', TokenObtainPairView.as_view(), name='api_token_auth'),
    path('token-refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    #update setting
    path('settings/', views.get_settings, name='get_settings'),  # GET endpoint
    path('update-username', views.update_username, name='update_username'),
    path('update-profile', views.update_profile, name='update-profile'),
    path('upload-profile-picture/', UploadProfilePictureView.as_view(), name='upload-profile-picture'),

    path('files/', FileListView.as_view(), name='file-list'),
   
    path('files/share/', views.share_file, name='share_file'),
   # path('files/shared/<str:share_link>/', views.shared_file_detail, name='shared_file_detail'),

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
    path('share/<int:file_id>/', ShareFileView.as_view(), name='share-file'),

    #file review
    path('file-preview/<int:file_id>/', FilePreviewView.as_view(), name='file_preview'),
    path('file-metadata/<int:file_id>/', FileMetadataView.as_view(), name='file_metadata'),

    #settings page
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),


    path('folders/', views.FolderListView.as_view(), name='folder-list'),  # GET
   path('folders/create/', views.FolderView.as_view(), name='folder-create'),  # POST
    path('folders/<int:folder_id>/', views.FolderContentView.as_view(), name='folder_list'),


    #new one
    path('folders/', FolderView.as_view(), name='create-folder'),



]

from django.contrib import admin
from .models import File, Folder

# Register your models here.
@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'path', 'parent_folder', 'user')
    search_fields = ('name', 'path')

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'size', 'file_path', 'folder', 'user_id')  # Use user_id
    search_fields = ('file_name', 'file_path')

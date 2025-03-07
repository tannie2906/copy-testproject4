# Generated by Django 5.1.2 on 2025-01-01 23:33

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0065_rename_user_id_folder_user'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RenameField(
            model_name='sharedfile',
            old_name='created_at',
            new_name='timestamp',
        ),
        migrations.RemoveField(
            model_name='sharedfile',
            name='permissions',
        ),
        migrations.RemoveField(
            model_name='sharedfile',
            name='share_link',
        ),
        migrations.AddField(
            model_name='sharedfile',
            name='shared_by',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, related_name='shared_by', to=settings.AUTH_USER_MODEL),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='sharedfile',
            name='file',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='myapp.file'),
        ),
        migrations.AlterField(
            model_name='sharedfile',
            name='shared_with',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shared_files', to=settings.AUTH_USER_MODEL),
        ),
    ]

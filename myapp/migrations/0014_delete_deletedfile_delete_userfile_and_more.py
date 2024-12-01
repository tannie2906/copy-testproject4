# Generated by Django 5.1.2 on 2024-12-01 21:54

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0013_deletedfile_userfile_file_is_deleted'),
    ]

    operations = [
        migrations.DeleteModel(
            name='DeletedFile',
        ),
        migrations.DeleteModel(
            name='UserFile',
        ),
        migrations.RemoveField(
            model_name='file',
            name='is_deleted',
        ),
        migrations.RemoveField(
            model_name='uploadedfile',
            name='is_deleted',
        ),
    ]

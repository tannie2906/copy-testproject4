# Generated by Django 5.1.2 on 2024-12-31 21:46

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0056_rename_parent_folder_parent_folder'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='folder',
            name='path',
        ),
        migrations.RemoveField(
            model_name='folder',
            name='user',
        ),
    ]

# Generated by Django 5.1.2 on 2024-12-31 03:27

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0052_file_folder_alter_folder_path'),
    ]

    operations = [
        migrations.AlterField(
            model_name='folder',
            name='parent_folder',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='myapp.folder'),
        ),
    ]

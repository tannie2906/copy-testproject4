# Generated by Django 5.1.2 on 2024-12-19 21:20

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0028_rename_name_deletedfile_file_name_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='deletedfile',
            name='deleted_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]

# Generated by Django 5.1.2 on 2024-12-19 00:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0025_file_created_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]

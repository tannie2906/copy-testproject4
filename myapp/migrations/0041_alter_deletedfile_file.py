# Generated by Django 5.1.2 on 2024-12-22 01:27

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0040_rename_picture_profile_profile_picture'),
    ]

    operations = [
        migrations.AlterField(
            model_name='deletedfile',
            name='file',
            field=models.CharField(max_length=500),
        ),
    ]

# Generated by Django 5.1.2 on 2025-02-26 21:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0076_sharedfile_allow_download_sharedfile_password'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sharedfile',
            name='allow_download',
            field=models.BooleanField(default=False),
        ),
    ]

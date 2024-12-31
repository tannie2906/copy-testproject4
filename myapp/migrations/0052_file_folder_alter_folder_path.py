# Generated by Django 5.1.2 on 2024-12-30 22:56

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0051_folder_parent_folder'),
    ]

    operations = [
        migrations.AddField(
            model_name='file',
            name='folder',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='files', to='myapp.folder'),
        ),
        migrations.AlterField(
            model_name='folder',
            name='path',
            field=models.TextField(blank=True, null=True),
        ),
    ]

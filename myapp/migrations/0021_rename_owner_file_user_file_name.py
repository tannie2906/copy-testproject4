# Generated by Django 5.1.2 on 2024-12-18 22:48

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('myapp', '0020_alter_file_file'),
    ]

    operations = [
        migrations.RenameField(
            model_name='file',
            old_name='owner',
            new_name='user',
        ),
        migrations.AddField(
            model_name='file',
            name='name',
            field=models.CharField(default=0, max_length=255),
            preserve_default=False,
        ),
    ]

# Generated by Django 3.2.5 on 2021-07-09 01:47

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='voiceprint',
            old_name='createdAt',
            new_name='date',
        ),
    ]

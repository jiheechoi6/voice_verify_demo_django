import django
from rest_framework import serializers
from .models import Voiceprint

class VoiceprintSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=100)
    date = serializers.DateTimeField()

    def create(self, validated_data):
        return Voiceprint.objects.create(username=validated_data["username"])

    def update(self, instance, validated_data):
        instance.title = validated_data.get('username', instance.username)
        instance.date = validated_data.get('date', instance.date)
        instance.save()
        return instance
from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse, JsonResponse, response
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
import requests
import json
import wave
import re
import os
import glob
from .models import Voiceprint
from .serializers import VoiceprintSerializer

URL = 'http://192.168.0.30:8000/api/v2'
STATUS_URL = '%s/status' %URL
STREAM_URL = '%s/stream/http' %URL
STREAM_DATA_URL = '%s/data/' %STREAM_URL 
STREAM_LIST_URL = '%s/streams' %URL
ENROLL_URL = '%s/enroll' %URL
VERIFY_URL = '%s/verify' %URL
DELETE_VOICEPRINT_URL = '%s/leave' %URL

TOKEN = 'dd4eccff7c83a817e80bd9668d34b6835f512ad1'
headers = {'Content-Type': 'application/json','Authorization':'TOKEN '+TOKEN, 'X-CSRFToken': 'LAKnkDv51yRUul2uiXyb8U5CbbXUHKYLS6aBBLz2nS1jMqMWfHLqCSN9ssuyhpRZ'}
frequency={'frequency':16000}

cur_uuid = ''
username_to_uuid = {}

# @csrf_exempt
def user_list(request):
    if request.method == 'GET':
        users = Voiceprint.objects.all()
        serializer = VoiceprintSerializer(users, many=True)

        return JsonResponse({"users": serializer.data}, safe=False)

    if request.method == 'POST':
        data = JSONParser().parse(request)

        if not data["username"]:
            return HttpResponse(status=400)

        newV = Voiceprint(username=data["username"])
        newV.save()
        return HttpResponse(status=200)

    if request.method == 'DELETE':
        user = JSONParser().parse(request)
        username = user["username"]

        delete_data = json.dumps({"external_id": username})
        res = requests.delete(DELETE_VOICEPRINT_URL, headers=headers, data=delete_data)
        print(res.status_code)
        #TODO handle different response code

        if not username:  # check if there's username passed over in body
            return HttpResponse(400)
        # print(Voiceprint.objects.get(username=user["username"]))
        print(username)
        deleted = Voiceprint.objects.filter(username=username)[0].delete()  # delete in db
        if deleted != 1:  # number of deleted is not 1
            return HttpResponse(status=500)

        return HttpResponse(status=201)

# @csrf_exempt
def enroll(request):
    if request.method != 'POST':  # currently only has post method
        return Response(status=404)

    external_id = JSONParser().parse(request)["username"]
    cur_uuid = username_to_uuid[external_id]
    enroll_json =  json.dumps( {'stream_uuid':cur_uuid, 'external_id':external_id} )
    res = requests.post(ENROLL_URL,headers=headers,data=enroll_json)
    status = res.status_code

    seconds = 0
    if status == 411: 
        message = res.json()["detail"]
        secondsint = list(filter(str.isdigit, message))
        secondsfloat = re.findall("\d+\.\d+", message)
        print(message)
        seconds = secondsfloat[0] if (len(secondsfloat) != 0) else secondsint[0]

    if status == 201:  # if successful, add to database
        newV = Voiceprint(username=external_id)
        newV.save()
    
    return JsonResponse({"secondsRecorded": seconds}, status=status)

# @csrf_exempt
def verify(request):
    if request.method != 'POST':
        return HttpResponse(status=404)

    external_id = JSONParser().parse(request)["username"]
    cur_uuid = username_to_uuid[external_id]
    verify_json = json.dumps(  {'stream_uuid':cur_uuid, 'external_id':external_id} )
    res = requests.post(VERIFY_URL, headers=headers,data=verify_json)
    status = res.status_code

    seconds = 0
    result = ""
    if status == 411: 
        message = res.json()["detail"]
        secondsint = list(filter(str.isdigit, message))
        secondsfloat = re.findall("\d+\.\d+", message)
        seconds = secondsfloat[0] if (len(secondsfloat) != 0) else secondsint[0]
    if status == 200:
        result = res.json()["result"]

    return JsonResponse({"secondsRecorded": seconds, "result": result}, status=status)

@csrf_exempt
def create_stream(request):
    username = JSONParser().parse(request)["username"]
    print(request)

    data = json.dumps(frequency)
    res = requests.post(STREAM_URL,headers=headers,data=data)  # create stream
    res_body = res.json()
    uuid = res_body['uuid']  # fetch uuid
    # global cur_uuid
    # cur_uuid = uuid
    global username_to_uuid
    username_to_uuid[username] = uuid

    # reset temp files
    files = glob.glob('./api/temp/*')
    for f in files:
        os.remove(f)

    return JsonResponse({'uuid': uuid}, status=res.status_code)

# @csrf_exempt
def upload_stream_data(request):
    # print(request.GET["uuid"])
    uuid = request.GET["uuid"]
    data = request.FILES['data']

    # print(data)

    dir2 = "./api/temp/test"

    with open(dir2 + ".pcm", 'wb') as _file:
        _file.write(data.read())

    with open(dir2 + ".pcm", 'rb') as pcmfile:
        pcmdata = pcmfile.read()
    with wave.open(dir2 + ".wav", 'wb') as wavfile:
        wavfile.setparams((1, 2, 16000, 0, 'NONE', 'NONE'))
        wavfile.writeframes(pcmdata)

    with open(dir2 + ".wav", 'rb') as _file:
        data = _file.read()
        # print(data)
        # print(cur_uuid)
        # cur_uuid = username_to_uuid[]
        res = requests.post(STREAM_DATA_URL+uuid,headers=headers,data=data)
        return HttpResponse(status=res.status_code)

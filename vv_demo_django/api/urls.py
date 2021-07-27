from django.urls import path
from .views import user_list, enroll, verify, create_stream, upload_stream_data

urlpatterns = [
    path('user', user_list),
    path('vv/enroll', enroll),
    path('vv/verify', verify),
    path('vv/create_stream', create_stream),
    path('vv/upload_stream_data', upload_stream_data),
]
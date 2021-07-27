from django.shortcuts import render

# Create your views here.

def display_homepage(request):
    return render(request, 'index.html')
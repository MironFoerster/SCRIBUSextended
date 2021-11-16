from django.shortcuts import render
from django.http import JsonResponse
import json

from.models import Design, Scribing

def designs(request):
    context = {
        'public_designs': Design.objects.filter(user__isnull=True),
        #'private_designs': Design.objects.filter(user=request.user)
    } #set design models as context
    return render(request, 'gallery/designs.html', context)

def scribings(request):
    context = {
        'public_scribings': Scribing.objects.filter(user=0),
        'private_scribings': Scribing.objects.filter(user=0)
    } #set scribing models as context
    return render(request, 'gallery/scribings.html', context)

def getdesigns(request):
    return JsonResponse(Design.objects.get(name=json.loads(request.body)['designName']).elements)

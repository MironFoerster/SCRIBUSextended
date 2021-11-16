from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Shape
from gallery.models import Design
import json
from . import cmdList
from . import control


@login_required(login_url='/home/login/')
def index(request):
    context = {'all_shapes': Shape.objects.all(),
               'all_designnames': list(Design.objects.values_list("name", flat=True))}
    return render(request, 'draw/index.html', context)


def submit(request):
    # get the submitted data

    submitData = json.loads(request.body)
    # save sent data to db according to save settings
    if submitData["save"] == "savepublic":
        design = Design(name=submitData["name"], elements=submitData["elements"])
        design.save()
    elif submitData["save"] == "saveprivate":
        design = Design(name=submitData["name"], user=request.user, elements=submitData["elements"])
        design.save()
    else:
        print('not saving design')

    # converting elements to SCode
    cmd_list = cmdList.fromElementsList(submitData['elements']['elements'])
    
    input('enter')
    # instanciate the robot
    scribus = control.Robot()
    # draw the cmd_list
    scribus.draw_cmd_list(cmd_list)
    
    return redirect('index')


def shapes(request):
    print('shapes view')
    return JsonResponse(Shape.objects.get(name=json.loads(request.body)['shapeName']).path)

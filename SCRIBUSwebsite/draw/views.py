from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .models import Shape, Scribing
from gallery.models import Design
import json
import threading
from django.core.cache import cache
from . import cmdList
from . import control
import scribemodel as scribe
import os

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
    queue = cache.get('queue')
    queue.append(cmd_list)
    cache.set('queue', queue)

    if len(queue) == 1:
        # instanciate the robot
        scribus = control.Robot()
        t = threading.Thread(target=scribus.draw_queue)
        # draw the cmd_list
        t.start()
    
    return redirect('index')


def shapes(request):
    print('shapes view')
    return JsonResponse(Shape.objects.get(name=json.loads(request.body)['shapeName']).path)


base_path = "C:/Users/miron/Git/scribeAI"

run_name = "miron"

model = scribe.Model()
model.compile(optimizer='adam',
              loss=[scribe.Loss(), None, None],
              metrics=[['accuracy'], [None, None]],
              run_eagerly=True)
model.evaluate(test_set.batch(batch_size=1).take(1), verbose=2)
model.load_weights(os.path.join(base_path, "checkpoints", run_name, "weights.hdf5"))
model.evaluate(test_set.batch(batch_size=1).take(1), verbose=2)


def scribe(request):
    print('scribe view')
    words = json.loads(request.body)['words']
    elements = []
    for word in words:
        element != model.predict(word)
        elements.append(element)

    scribing = Scribing(elements=elements)
    scribing.save()
    return JsonResponse(scribing.elements)

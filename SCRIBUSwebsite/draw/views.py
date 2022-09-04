from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import JsonResponse
from .models import Shape, Scribing
from gallery.models import Design
import json
import threading
from django.core.cache import cache
#from . import control
#import tensorflow as tf
#from . import scribemodel as scribe
import os

def index(request):
    context = {'shapes': Shape.objects.all(),
               'designs': Design.objects.all(),
               'designnames': list(Design.objects.values_list("name", flat=True))}
    return render(request, 'draw/index.html', context)


"""base_path = "C:/Users/miron/Git/scribeAI"

run_name = "miron"

model = scribe.Model()
model.compile(optimizer='adam',
              loss=[scribe.Loss(), None, None],
              metrics=[['accuracy'], [None, None]],
              run_eagerly=True)
model.evaluate(test_set.batch(batch_size=1).take(1), verbose=2)
model.load_weights(os.path.join(base_path, "checkpoints", run_name, "weights.hdf5"))
model.evaluate(test_set.batch(batch_size=1).take(1), verbose=2)


def generate(request):
    print('scribe view')
    words = json.loads(request.body)['words']
    preds = []
    for word in words:
        pred = model.predict(word)
        preds.append(pred)

    scribing = Scribing(hws=pred, words=words)
    scribing.save()
    return JsonResponse(scribing.hws)  # hws = [{"path":[...]}, {"path":[...]}, ...]
"""
def generate(request):
    return JsonResponse({"success": True})

def save(request):
    submit_data = json.loads(request.body)

    design = Design(name=submit_data["name"], elements=submit_data["elements"])
    design.save()

    return JsonResponse({"success": True})


def robodraw(request):
    submit_data = json.loads(request.body)
    queue = cache.get('queue')
    queue.append(submit_data['elements']['elements'])
    cache.set('queue', queue)

    if len(queue) == 1:
        pass
        # instanciate the robot
        #scribus = control.Robot()
        #t = threading.Thread(target=scribus.draw_queue)
        # draw the cmd_list
        #t.start()
    
    return JsonResponse({"success": True})

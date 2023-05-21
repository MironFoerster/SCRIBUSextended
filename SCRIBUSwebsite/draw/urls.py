from django.urls import path
from . import views
# ugly workaround
from django.views.decorators.csrf import csrf_exempt

app_name = 'draw'

urlpatterns = [
    path('', views.index, name='index'),
    path('generate/', csrf_exempt(views.generate), name='generate'),
    path('save/', views.save, name='save'),
    path('robodraw/', views.robodraw, name='robodraw'),
]

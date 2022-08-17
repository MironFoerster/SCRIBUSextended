from django.urls import path
from . import views

app_name = 'draw'

urlpatterns = [
    path('', views.index, name='index'),
    path('generate/', views.generate, name='generate'),
    path('save/', views.save, name='save'),
    path('robodraw/', views.robodraw, name='robodraw'),
]

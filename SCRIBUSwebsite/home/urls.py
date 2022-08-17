from django.urls import path
from . import views

app_name = 'home'

urlpatterns = [
    path('menu/', views.menu, name='menu'),
    path('about/', views.about, name='about'),
    path('welcome/', views.welcome, name='welcome'),
]

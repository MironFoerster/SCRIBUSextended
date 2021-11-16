from django.urls import path
from . import views

app_name = 'draw'

urlpatterns = [
    path('', views.index, name='index'),
    path('submit/', views.submit, name='submit'),
    path('shapes/', views.shapes, name='shapes'),

]

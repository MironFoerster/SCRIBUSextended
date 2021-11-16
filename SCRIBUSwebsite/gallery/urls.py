from django.urls import path
from . import views

app_name = 'gallery'

urlpatterns = [
    path('designs/', views.designs, name='designs'),
    path('scribings/', views.scribings, name='scribings'),
    path('getdesigns/', views.getdesigns, name='getdesigns'),

]

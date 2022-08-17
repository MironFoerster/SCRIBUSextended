from django.shortcuts import render, redirect
from django.contrib.auth import logout, login, authenticate


def menu(request):
    context = None
    return render(request, 'home/menu.html', context)

def about(request):
    context = None
    return render(request, 'home/about.html', context)

def welcome(request):
    context = None
    return render(request, 'home/welcome.html', context)

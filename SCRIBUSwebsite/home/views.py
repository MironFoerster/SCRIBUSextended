from django.shortcuts import render, redirect
from django.contrib.auth import logout, login, authenticate


def index(request):
    
    context=None
    return render(request, 'home/index.html', context)

def login_view(request):
    context=None
    
    if request.method == 'GET':
        return render(request, 'home/login.html', context)
        
    elif request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            # Redirect to a success page.
            return redirect('home:index')
        else:
            # Return an 'invalid login' error message.
            return redirect('home:login')

    
def login_data(request):
    context=None
    return redirect('home:login')

def logout_view(request):
    logout(request)
    return redirect('home:index')

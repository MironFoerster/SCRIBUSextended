from django.apps import AppConfig


class DrawConfig(AppConfig):
    name = 'draw'
    def ready(self):
        # code for startup, initialize cache variables
        cache.set('cmd_list_queue', [])

from django.db import models
from django.contrib.auth.models import User
# Create your models here.
class Design(models.Model):
    name = models.CharField(max_length=20)
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True,  null=True)
    elements = models.JSONField()

    def __str__(self):
        return self.name

class Scribing(models.Model):
    name = models.CharField(max_length=20)
    user = models.ForeignKey(User, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return self.name
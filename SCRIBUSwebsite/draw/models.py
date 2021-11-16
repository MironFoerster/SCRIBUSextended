from django.db import models

# Create your models here.
class Shape(models.Model):
    name = models.CharField(max_length=20)
    path = models.JSONField()

    def __str__(self):
        return self.name

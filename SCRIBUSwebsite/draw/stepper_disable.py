import RPi.GPIO as gpio

gpio.setwarnings(False)
gpio.setmode(gpio.BCM)


gpio.setup((4,12), gpio.OUT)
gpio.output((4,12), 1)

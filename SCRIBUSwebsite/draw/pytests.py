import RPi.GPIO as gpio
import time

gpio.setwarnings(False)
gpio.setmode(gpio.BCM)

gpio.setup(12, gpio.OUT)
gpio.output(12, 0)
time.sleep(1)
gpio.output(12, 1)
gpio.setup(4, gpio.OUT)
gpio.output(4, 0)
time.sleep(1)
gpio.output(4, 1)

gpio.output(12, 0)
gpio.output(4, 0)

gpio.setup(19, gpio.OUT)
gpio.setup(13, gpio.OUT)
stepdelay = 0.00005
direction = 1
gpio.output(13, direction)
for j in range(200):
	print(j)
	#gpio.output(13, direction)
	for i in range(32):
		gpio.output(19, 1)
		time.sleep(stepdelay)
		gpio.output(19, 0)
		time.sleep(stepdelay)
	#time.sleep(stepdelay)
	#gpio.output(13, direction)
	for i in range(32):
		gpio.output(19, 1)
		time.sleep(stepdelay)
		gpio.output(19, 0)
		time.sleep(stepdelay)
	#time.sleep(stepdelay)
time.sleep(3)	
gpio.output(4, 1)
gpio.output(12, 1)
time.sleep(1)
gpio.output(4, 0)
gpio.output(12, 0)
time.sleep(3)
gpio.output(4, 1)
gpio.output(12, 1)

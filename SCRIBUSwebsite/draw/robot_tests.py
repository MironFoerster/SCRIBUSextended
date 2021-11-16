import motor
import control
import RPi.GPIO as gpio
import time

gpio.setwarnings(False)
gpio.setmode(gpio.BCM)

def servo_test(frq, pwidth):
    srv = motor.Servo(14, frq)
    
    srv.set_pulsewidth(pwidth)
    time.sleep(3)
    srv.set_pen_state(0)
    time.sleep(3)
    srv.set_pen_state(1)
    
    srv.stop()
    

def stepper_test():
    rbt = control.Robot()
    rbt.enable()
    rbt.draw_cmd_list([{'mode':'moveto','x':200,'y':100}, {'mode':'lineto','x':300,'y':400}, {'mode':'lineto','x':400,'y':390}, {'mode':'lineto','x':0,'y':0}])

    
def stop_robot():
    gpio.setup((4,12), gpio.OUT)
    gpio.output((4,12), 1)
    
    

#servo_test(50, 1000) # 1200-penup 2000-pendown


# max freq == 170 min == 25 best (www) == 50
# penup == dc 6, pendown == dc 9

stepper_test()
#stop_robot()
#print('helo')
#for i in range(6.76):
 #   print(i)
    
    

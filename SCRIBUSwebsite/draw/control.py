# Importiert das motor-Modul und andere benötigte Module
import numpy as np

from . import motor
import RPi.GPIO as gpio
import copy
import time
from django.core.cache import cache
import math


# Deaktiviert Warnungen
gpio.setwarnings(False)
# Legt Pinbenennung auf GPIO-Nummern fest (alternativ gpio.BOARD für Pin-Nummern)
gpio.setmode(gpio.BCM)


# Definiert die Robot-Klasse, von der Robot-Instanzen erstellt werden können
class Robot:
    def __init__(self):  # Wird bei Instanziierung ausgeführt
        # Erstellt Stepper-Instanzen für beide Schrittmotoren
        self.mx = motor.Stepper(13, 12, 19)
        self.my = motor.Stepper(24, 4, 18)
        # Erstellt eine Servo-Instanz für den Servomotor
        self.mservo = motor.Servo(14)
        # Legt die GPIO-Nummern fest, an denen die Schalter angeschlossen sind
        self.x_switch_pin = 9
        self.y_switch_pin = 10
        # Konfiguriert die Schalter-Pins als input Pins mit Pull Down Widerstand
        gpio.setup((self.x_switch_pin, self.y_switch_pin), gpio.IN, pull_up_down=gpio.PUD_DOWN)
        
        # Legt Geschwindigkeit fest
        self.fsteps_per_sec = 100
        # Legt Microstepping fest
        self.steps_per_fstep = 32
        # Initialisiert die State-Variable des Roboters
        self.pos = [-1, -1]
        self.truepos = None
        self.execute = True

    def home(self):  # Dient zum homing (Bringt Roboter zum Punkt (0|0) )
        time.sleep(1)
        # Hebt den Stift für die Bewegung zum Nullpunkt und aktualisiert State-Variable
        self.mservo.raise_pen()
        # Errechnet die Periodenlänge/Dauer eines Schritts
        stepdur = 1.0/self.fsteps_per_sec/self.steps_per_fstep
        phasedur = stepdur/2

        # Setzt beide Direction-Pins auf Richtung Nullpunkt
        gpio.output(self.mx.dir_pin, 1)
        gpio.output(self.my.dir_pin, 0)

        # Wiederholt solange mindestens ein Schalter nicht gedrückt ist
        while gpio.input(self.x_switch_pin) == 0 or gpio.input(self.y_switch_pin) == 0:
            # Prüft, ob einer der Schalter vielleicht doch schon gedrückt ist
            # führt eine AN-Phase durch, wenn Schalter nicht gedrückt ist
            # AUS-Phase des einen Motors erfolgt während der AN-Phase des anderen Motors
            # wenn ein Schalter gedrückt ist, wird für die AUS-Phase des anderen Motors trotzdem phasedur gewartet

            if gpio.input(self.x_switch_pin) == 0:
                gpio.output(self.mx.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.mx.stp_pin, 0)
            else:
                time.sleep(phasedur)

            if gpio.input(self.y_switch_pin) == 0:
                gpio.output(self.my.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.my.stp_pin, 0)
            else:
                time.sleep(phasedur)
        
        # Wiederholt dasselbe in umgekehrter Richtung, bis Schalter wieder entlastet sind
        gpio.output(self.mx.dir_pin, 0)
        gpio.output(self.my.dir_pin, 1)
        
        # Führt Bewegung mit langsamerer Geschwindigkeit von 30fps aus
        stepdur = 1.0/30/self.steps_per_fstep
        phasedur = stepdur/2

        while gpio.input(self.x_switch_pin) == 1 or gpio.input(self.y_switch_pin) == 1:
            if gpio.input(self.x_switch_pin) == 0:
                gpio.output(self.mx.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.mx.stp_pin, 0)
            else:
                time.sleep(phasedur)

            if gpio.input(self.y_switch_pin) == 0:
                gpio.output(self.my.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.my.stp_pin, 0)
            else:
                time.sleep(phasedur)

        # Deaktiviert die Step-Pins
        gpio.output(self.mx.stp_pin, 0)
        gpio.output(self.my.stp_pin, 0)
        # Aktualisiert die State-Variable
        self.pos = [0, 0]
        self.truepos = [0, 0]
        time.sleep(1)

    # bresenham implementations from https://zingl.github.io/Bresenham.pdf

    def linear_to(self, end):
        spf = 32  # microsteps per fullstep

        cmpos = [int(i * spf) for i in copy.deepcopy(self.pos)]  # current micro position
        mend = [int(i * spf) for i in copy.deepcopy(end)]  # micro endpoint

        # Setzt beide Direction-Pins auf richtige Richtung
        gpio.output(self.mx.dir_pin, 0 if end[0] > cmpos[0] else 1)
        gpio.output(self.my.dir_pin, 1 if end[1] > cmpos[1] else 0)

        # Errechnet die Periodenlänge/Dauer eines Schritts
        stepdur = 1.0 / self.fsteps_per_sec / self.steps_per_fstep
        phasedur = stepdur / 2

        dx = abs(mend[0]-cmpos[0])
        sx = 1 if end[0] > cmpos[0] else -1 if end[0] < cmpos[0] else 0
        dy = -abs(mend[1]-cmpos[1])
        sy = 1 if end[1] > cmpos[1] else -1 if end[1] < cmpos[1] else 0
        err = dx + dy

        while True:
            e2 = 2 * err
            if e2 >= dy:
                if cmpos[0] == mend[0]:
                    break
                err += dy
                # cmpos[0] += sx
                x_step = True
            else:
                x_step = False
                """if onto_grid:
                    if self.truepos is None:  # no reentering of the grid, normal step
                        # führt einen x-Schritt aus
                        gpio.output(self.mx.stp_pin, 1)
                        time.sleep(phasedur)
                        gpio.output(self.mx.stp_pin, 0)
                    else:  # grid is reentered, make a linear move from the truepos to the point of reentry
                        self.pos = copy.deepcopy(self.truepos)
                        self.truepos = None
                        self.linear_to([i / spf for i in cmpos])
                        self.mservo.lower_pen()
                        # current linear_to is simply continued after that
                elif self.truepos is None:
                    self.mservo.raise_pen()
                    self.truepos = [i/spf for i in copy.deepcopy(cmpos)]  # true position

            else:
                if onto_grid:
                    time.sleep(phasedur)"""

            if e2 <= dx:
                if cmpos[1] == mend[1]:
                    break
                err += dx
                # cmpos[1] += sy
                y_step = True
            else:
                y_step = False
                """if onto_grid:
                    # führt einen y-Schritt aus
                    gpio.output(self.my.stp_pin, 1)
                    time.sleep(phasedur)
                    gpio.output(self.my.stp_pin, 0)
                else:

            else:
                if onto_grid:
                    time.sleep(phasedur)"""
                
            pmpos = copy.deepcopy(cmpos)  # previous micro position
            cmpos = [cmpos[0] + sx * int(x_step), cmpos[1] + sy * int(y_step)]  # update current micro position
            
            maxmc = 1000 * spf  # maximum micro coordinates
            # WHAT ABOUT PATHS THAT START OUTSIDE
            # following expressions are True if the respective position is inside the drawing area
            if 0 <= pmpos[0] <= maxmc and 0 <= pmpos[1] <= maxmc:
                if 0 <= cmpos[0] <= maxmc and 0 <= cmpos[1] <= maxmc:  # current step STAYS INSIDE the drawing area
                    if x_step:
                        gpio.output(self.mx.stp_pin, 1)
                        time.sleep(phasedur)
                        gpio.output(self.mx.stp_pin, 0)
                    else:
                        time.sleep(phasedur)

                    if y_step:
                        gpio.output(self.my.stp_pin, 1)
                        time.sleep(phasedur)
                        gpio.output(self.my.stp_pin, 0)
                    else:
                        time.sleep(phasedur)
                else:  # current step EXITS the drawing area; save true position
                    self.truepos = copy.deepcopy(pmpos)
            else:
                if 0 <= cmpos[0] <= maxmc and 0 <= cmpos[1] <= maxmc:  # current step ENTERS the drawing area; make a linear move from the truepos to the entry point
                    self.pos = copy.deepcopy(self.truepos)
                    self.truepos = None
                    self.linear_to([i / spf for i in cmpos])
                    self.mservo.lower_pen()
                    # current linear_to is simply continued after that
                else:  # current step STAYS OUTSIDE the drawing area
                    pass

        self.pos = end

    def bezier_seg(self, ctrl, end):
        spf = 32  # microsteps per fullstep

        cmpos = [i * spf for i in copy.deepcopy(self.pos)]  # current micro position
        mctrl = [i * spf for i in copy.deepcopy(ctrl)]  # micro controlpoint
        mend = [i * spf for i in copy.deepcopy(end)]  # micro endpoint

        # Setzt beide Direction-Pins auf richtige Richtung
        gpio.output(self.mx.dir_pin, 0 if end[0] > cmpos[0] else 1)
        gpio.output(self.my.dir_pin, 1 if end[1] > cmpos[1] else 0)

        # Errechnet die Periodenlänge/Dauer eines Schritts
        stepdur = 1.0 / self.fsteps_per_sec / self.steps_per_fstep
        phasedur = stepdur / 2

        sx = mend[0] - mctrl[0]
        sy = mend[1] - mctrl[1]
        xx = cmpos[0] - mctrl[0]
        yy = cmpos[1] - mctrl[1]
        cur = xx * sy - yy * sx

        assert xx * sx <= 0 and yy * sy <= 0

        """if sx*sx+sy*sy > xx*xx+yy*yy:
            mend[0] = cmpos[0]
            cmpos[0] = sx+mctrl[0]
            mend[1] = cmpos[1]
            cmpos[1] = sy+mctrl[1]
            cur = -cur"""

        if cur != 0:
            xx += sx
            sx = 1 if cmpos[0] < mend[0] else -1
            xx *= sx
            yy += sy
            sy = 1 if cmpos[1] < mend[1] else -1
            yy *= sy
            xy = 2 * xx * yy
            xx *= xx
            yy *= yy
            if cur * sx * sy < 0:
                xx = -xx
                yy = -yy
                xy = -xy
                cur = -cur
            dx = 4.0 * sy * cur * (mctrl[0] - cmpos[0]) + xx - xy
            dy = 4.0 * sx * cur * (cmpos[1] - mctrl[1]) + yy - xy
            xx += xx
            yy += yy
            err = dx + dy + xy
            while True:
                if cmpos[0] == mend[0] and cmpos[1] == mend[1]:
                    self.pos = end
                    return
                if 2 * err > dy:
                    cmpos[0] += sx
                    dx -= xy
                    dy += yy
                    err += dy

                    # führt einen x-Schritt aus
                    gpio.output(self.my.stp_pin, 1)
                    time.sleep(phasedur)
                    gpio.output(self.my.stp_pin, 0)
                else:
                    time.sleep(phasedur)

                mctrl[1] = 2 * err < dx
                if mctrl[1]:
                    cmpos[1] += sy
                    dy -= xy
                    dx += xx
                    err += dx

                    # führt einen y-Schritt aus
                    gpio.output(self.my.stp_pin, 1)
                    time.sleep(phasedur)
                    gpio.output(self.my.stp_pin, 0)
                else:
                    time.sleep(phasedur)

                if dy < 0 and dx > 0:
                    break
        self.pos = [cmpos[0]/spf, cmpos[1]/spf]
        self.linear_to(end)

    def bezier_to(self, ctrl, end):
        start = self.pos
        x = start[0] - ctrl[0]
        y = start[1] - ctrl[1]

        if x * (end[0] - ctrl[0]) > 0:
            t = start[0] - 2 * ctrl[0] + end[0]
            t = (start[0]-ctrl[0]) / t
            r = (1-t) * ((1-t) * start[1]+2.0 * t * ctrl[1])+t * t * end[1]
            t = (start[0] * end[0]-ctrl[0] * ctrl[0]) * t / (start[0]-ctrl[0])
            x = math.floor(t+0.5)
            y = math.floor(r+0.5)
            r = (ctrl[1]-start[1]) * (t-start[0]) / (ctrl[0]-start[0])+start[1]
            self.bezier_to([x, math.floor(r+0.5)], [x, y])
            r = (ctrl[1]-end[1]) * (t-end[0]) / (ctrl[0]-end[0])+end[1]
            ctrl[0] = x
            ctrl[1] = math.floor(r+0.5)
            self.bezier_to(ctrl, end)

        elif y * (end[1] - ctrl[1]) > 0:
            t = start[1] - 2 * ctrl[1] + end[1]
            t = (start[1]-ctrl[1]) / t
            r = (1-t) * ((1-t) * start[0]+2.0 * t * ctrl[0])+t * t * end[0]
            t = (start[1] * end[1]-ctrl[1] * ctrl[1]) * t / (start[1]-ctrl[1])
            x = math.floor(r+0.5)
            y = math.floor(t+0.5)
            r = (ctrl[0]-start[0]) * (t-start[1]) / (ctrl[1]-start[1])+start[0]
            self.bezier_to([math.floor(r+0.5), y], [x, y])
            r = (ctrl[0]-end[0]) * (t-end[1]) / (ctrl[1]-end[1])+end[0]
            ctrl[0] = math.floor(r+0.5)
            ctrl[1] = y
            self.bezier_to(ctrl, end)

        else:
            self.bezier_seg(ctrl, end)

    def bezier_to_orig(self, ctrl, end):
        start = self.pos
        x = start[0] - ctrl[0]
        y = start[1] - ctrl[1]
        t = start[0] - 2 * ctrl[0] + end[0]
        if x * (end[0]-ctrl[0]) > 0:
            if y * (end[1]-ctrl[1]) > 0:
                if abs((start[1]-2 * ctrl[1]+end[1]) / t * x) > abs(y):
                    start[0] = end[0]
                    end[0] = x+ctrl[0]
                    start[1] = end[1]
                    end[1] = y+ctrl[1]

            t = (start[0]-ctrl[0]) / t
            r = (1-t) * ((1-t) * start[1]+2.0 * t * ctrl[1])+t * t * end[1]
            t = (start[0] * end[0]-ctrl[0] * ctrl[0]) * t / (start[0]-ctrl[0])
            x = math.floor(t+0.5)
            y = math.floor(r+0.5)
            r = (ctrl[1]-start[1]) * (t-start[0]) / (ctrl[0]-start[0])+start[1]
            self.bezier_seg(start[0], start[1], x, math.floor(r+0.5), x, y)
            r = (ctrl[1]-end[1]) * (t-end[0]) / (ctrl[0]-end[0])+end[1]
            start[0] = ctrl[0] = x
            start[1] = y
            ctrl[1] = math.floor(r+0.5)

        if (start[1]-ctrl[1]) * (end[1]-ctrl[1]) > 0:
            t = start[1]-2 * ctrl[1]+end[1]
            t = (start[1]-ctrl[1]) / t
            r = (1-t) * ((1-t) * start[0]+2.0 * t * ctrl[0])+t * t * end[0]
            t = (start[1] * end[1]-ctrl[1] * ctrl[1]) * t / (start[1]-ctrl[1])
            x = math.floor(r+0.5)
            y = math.floor(t+0.5)
            r = (ctrl[0]-start[0]) * (t-start[1]) / (ctrl[1]-start[1])+start[0]
            self.bezier_seg(start[0], start[1], math.floor(r+0.5), y, x, y)
            r = (ctrl[0]-end[0]) * (t-end[1]) / (ctrl[1]-end[1])+end[0]
            start[0] = x
            ctrl[0] = math.floor(r+0.5)
            ctrl[1] = y
            start[1] = ctrl[1]
        self.bezier_seg(start[0], start[1], ctrl[0], ctrl[1], end[0], end[1])

    def middle(self, a, b):
        return [int((a[0]+b[0])/2), int((a[1]+b[1])/2)]

    def percent_between(self, p, a, b):
        return [a[0]+int((a[0]-b[0])*p), a[1]+int((a[1]-b[1])*p)]

    def enable(self):  # Aktiviert die Schrittmotoren
        self.mx.set_enable_state(0)
        self.my.set_enable_state(0)

    def disable(self):  # Deaktiviert die Schrittmotoren
        self.mx.set_enable_state(1)
        self.my.set_enable_state(1)

    def draw_queue(self):  # lässt den Roboter die queue zeichnen
        queue = cache.get('queue')
        while queue:
            elements = queue.pop(0)
            self.enable()
            self.home()

            # Durchläuft jedes Element in der queue
            for element in elements:
                scl = element['scale']
                rot = element['rotation']
                org = element['origin']
                sm = element['smooth']
                path = []

                # transformieren des pfads zu absoluten koordinaten
                for partpath in element['path']:
                    path.append([])
                    for point in partpath:
                        point = [point[0]*scl, point[1]*scl]
                        point = [point[0]*math.cos(rot*math.pi/180) - point[1]*math.sin(rot*math.pi/180),
                                 point[0]*math.sin(rot*math.pi/180) + point[1]*math.cos(rot*math.pi/180)]
                        point = [point[0]+org['x'], point[1]+org['y']]

                        path[-1].append(point)

                # ausführen der Zeichnung
                for partpath in path:
                    # bewegung zum beginn des partpaths
                    self.mservo.raise_pen()
                    self.linear_to(partpath[0])

                    if len(partpath) == 1:
                        continue

                    if sm == 0:  # keine Abrundung
                        for point in partpath[1:]:
                            self.linear_to(point)
                    elif sm == 1:  # vollständige Abrundung
                        if partpath[0] == partpath[-1]:
                            self.linear_to(self.middle(partpath[0], partpath[1]))
                            self.mservo.lower_pen()
                        else:
                            self.mservo.lower_pen()
                            self.linear_to(self.middle(partpath[0], partpath[1]))

                        for ctrl_point, next_point in zip(partpath[1:-1], partpath[2:]):
                            self.bezier_to(ctrl_point, self.middle(ctrl_point, next_point))

                        if partpath[0] == partpath[-1]:
                            self.bezier_to(partpath[0], self.middle(partpath[0], partpath[1]))
                        else:
                            self.linear_to(partpath[-1])
                    else:  # teilweise Abrundung
                        if partpath[0] == partpath[-1]:
                            self.linear_to(self.percent_between(0.5 + (1 - sm) / 2, partpath[0], partpath[1]))
                            self.mservo.lower_pen()
                        else:
                            self.mservo.lower_pen()
                            self.linear_to(self.percent_between(0.5 + (1 - sm) / 2, partpath[0], partpath[1]))

                        for ctrl_point, next_point in zip(partpath[1:-1], partpath[2:]):
                            self.bezier_to(ctrl_point, self.percent_between(sm/2, ctrl_point, next_point))
                            self.linear_to(self.percent_between((1-sm)/(1-sm/2), self.pos, next_point))

                        if partpath[0] == partpath[-1]:
                            self.bezier_to(partpath[0], self.percent_between(sm/2, partpath[0], partpath[1]))
                            self.linear_to(self.percent_between((1 - sm) / (1 - sm / 2), self.pos, partpath[1]))
                        else:
                            self.linear_to(partpath[-1])

            self.home()
            self.mservo.stop()
            self.disable()
            time.sleep(30)
            queue = cache.get('queue')
            queue.pop(0)
            cache.set('queue', queue)

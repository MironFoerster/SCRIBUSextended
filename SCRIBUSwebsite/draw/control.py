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
        self.pen = -1
        self.pos = [-1, -1]

    def home(self):  # Dient zum homing (Bringt Roboter zum Punkt (0|0) )
        time.sleep(1)
        if self.pen != 1:
            # Hebt den Stift für die Bewegung zum Nullpunkt und aktualisiert State-Variable
            self.mservo.raise_pen()
            self.pen = 1
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
        time.sleep(1)

    def linear_move(self, cmd):  # Lässt den Roboter zu einem bestimmten Punkt fahren
        # Berechnet Strecke für X-Motor Y-Motor und Strokestrecke
        distance = {'x': cmd['x'] - self.pos[0], 'y': cmd['y'] - self.pos[1]}
        distance.update({'stroke': math.sqrt(math.pow(distance['x'], 2)+math.pow(distance['y'], 2))})

        direction = {}
        # Berechnet Richtungen für beide Motoren
        if distance['x'] >= 0:
            direction['x'] = 0
        else:
            direction['x'] = 1

        if distance['y'] >= 0:
            direction['y'] = 1
        else:
            direction['y'] = 0
            
        # Setzt die Direction-Pins entsprechend der Berechnungen
        gpio.output(self.mx.dir_pin, direction['x'])
        gpio.output(self.my.dir_pin, direction['y'])
            
        # Entfernt Vorzeichen vor den Motor- Strecken
        distance.update({'x': abs(distance['x']), 'y': abs(distance['y'])})
        
        # Berechnet Dauer des Strokes mithilge von Strokestrecke und Geschwindigkeit
        stroke_duration = distance['stroke']/float(self.fsteps_per_sec)
        
        # Berechnet Anzahl derzurückzulegenden  Schritte für den jeweiligen Motor
        x_stepcount = distance['x']*self.steps_per_fstep
        y_stepcount = distance['y']*self.steps_per_fstep
        
        # Prüft, ob der jeweilige Motor überhaupt Schritte zurücklegen muss
        # Berechnet Streckungsfaktor oder setzt ihn auf 0, um den Motor zu deaktivieren
        if x_stepcount > 0:
            x_stepdur = stroke_duration/x_stepcount
            x_sin_factor = 2*math.pi/x_stepdur
        else:
            x_sin_factor = 0
            
        if y_stepcount > 0:
            y_stepdur = stroke_duration/y_stepcount
            y_sin_factor = 2*math.pi/y_stepdur
        else:
            y_sin_factor = 0

        # Führt das selbe aus, wie home(), nur mit zwei unterschiedlich gestreckten
        # Sinusfunktionen, jede für einen Motor, und ohne Schalterprüfung
        start_time = time.time()
        x_pin_state = 0
        y_pin_state = 0
        rel_time = time.time() - start_time
        
        # Wiederholt, solange die erwartete Strokedauer nicht erreicht ist
        while rel_time < stroke_duration:
                               
            x_calc_pin_state = int(math.sin(rel_time*x_sin_factor) > 0)
            y_calc_pin_state = int(math.sin(rel_time*y_sin_factor) > 0)
            
            if x_pin_state != x_calc_pin_state:
                gpio.output(self.mx.stp_pin, x_calc_pin_state)
                x_pin_state = x_calc_pin_state

            if y_pin_state != y_calc_pin_state:
                gpio.output(self.my.stp_pin, y_calc_pin_state)
                y_pin_state = y_calc_pin_state
                
            rel_time = time.time()-start_time

        # Aktualisiert die State-Variable mit dem neuen Punkt
        self.pos[0] = cmd['x']
        self.pos[1] = cmd['y']

    # bresenham implementations from https://zingl.github.io/Bresenham.pdf

    def linear_to(self, end):
        spf = 32  # microsteps per fullstep

        cmpos = [int(i * spf) for i in copy.deepcopy(self.pos)]  # current micro position
        mend = [i * spf for i in copy.deepcopy(end)]  # micro endpoint

        # Setzt beide Direction-Pins auf richtige Richtung
        gpio.output(self.mx.dir_pin, 0 if end[0] > cmpos[0] else 1)
        gpio.output(self.my.dir_pin, 1 if end[1] > cmpos[1] else 0)

        # Errechnet die Periodenlänge/Dauer eines Schritts
        stepdur = 1.0 / self.fsteps_per_sec / self.steps_per_fstep
        phasedur = stepdur / 2

        dx = abs(mend[0]-cmpos[0])
        sx = 1 if end[0] > cmpos[0] else -1
        dy = -abs(mend[1]-cmpos[1])
        sy = 1 if end[1] > cmpos[1] else -1
        err = dx + dy

        while True:
            e2 = 2 * err
            if e2 >= dy:
                if cmpos[0] == mend[0]:
                    break
                err += dy
                cmpos[0] += sx

                # führt einen x-Schritt aus
                gpio.output(self.mx.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.mx.stp_pin, 0)
            else:
                time.sleep(phasedur)

            if e2 <= dx:
                if cmpos[1] == mend[1]:
                    break
                err += dx
                cmpos[1] += sy

                # führt einen y-Schritt aus
                gpio.output(self.my.stp_pin, 1)
                time.sleep(phasedur)
                gpio.output(self.my.stp_pin, 0)
            else:
                time.sleep(phasedur)

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
                sm = element['smoothness']
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
                    self.linear_to(partpath.pop(0))
                    self.mservo.lower_pen()
                    self.pen = 0

                    if sm == 0:  # keine Abrundung
                        for point in partpath:
                            self.linear_to(point)
                    elif sm == 1:  # vollständige Abrundung
                        self.linear_to(self.middle(self.pos, partpath[0]))
                        for ctrl_point, next_point in zip(partpath[:-1], partpath[1:]):
                            self.bezier_to(ctrl_point, self.middle(ctrl_point, next_point))
                        self.linear_to(partpath[-1])
                    else:  # teilweise Abrundung
                        self.linear_to(self.percent_between(0.5 + (1-sm)/2, self.pos, partpath[0]))
                        for ctrl_point, next_point in zip(partpath[:-1], partpath[1:]):
                            self.bezier_to(ctrl_point, self.percent_between(sm/2, ctrl_point, next_point))
                            self.linear_to(self.percent_between((1-sm)/(1-sm/2), self.pos, next_point))
                        self.linear_to(partpath[-1])

                    self.mservo.raise_pen()
                    self.pen = 1

            self.home()
            self.mservo.stop()
            self.disable()
            time.sleep(30)
            queue = cache.get('queue')
            queue.pop(0)
            cache.set('queue', queue)

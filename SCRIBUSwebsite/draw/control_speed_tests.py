# Importiert das motor-Modul und andere benötigte Module
import motor
import RPi.GPIO as gpio
import math
import time

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
        self.current_state = {'mode': '', 'x': None, 'y': None}

    def home_pos(self):  # Dient zum homing (Bringt Roboter zum Punkt (0|0) )
        time.sleep(1)
        # Errechnet die Periodenlänge/Dauer eines Schritts
        stepdur = 1.0/self.fsteps_per_sec/self.steps_per_fstep
        # Errechnet den Streckungsfaktor für die Sinusfunktion
        sin_factor = 2*math.pi/stepdur
        
        # Setzt beide Direction-Pins auf Richtung Nullpunkt
        gpio.output(self.mx.dir_pin, 1)
        gpio.output(self.my.dir_pin, 0)
        
        # Speichert die Startzeit
        start_time = time.time()
        rel_time = 0
        pin_state = 0       
        # Initialisiert die Zeit relativ zur Startzeit
        rel_time = time.time()-start_time
        
        # Wiederholt solange mindestens ein Schalter nicht gedrückt ist
        while gpio.input(self.x_switch_pin) == 0 or gpio.input(self.y_switch_pin) == 0:
            
            # Berechnet den erwarteten Pin-State
            calc_pin_state = int(math.sin(rel_time*sin_factor)>0)
            
            # Prüft, ob der wahre Pin-State sich vom erwarteten unterscheidet
            if pin_state != calc_pin_state:
                
                # Prüft, ob einer der Schalter vielleicht doch schon gedrückt ist
                # Aktualisiert den Pin-State, wenn Schalter nicht gedrückt ist
                if gpio.input(self.x_switch_pin) == 0:
                        gpio.output(self.mx.stp_pin, calc_pin_state)

                if gpio.input(self.y_switch_pin) == 0:
                        gpio.output(self.my.stp_pin, calc_pin_state)
                
                # Aktulisiert die Pin-State Variable
                pin_state = calc_pin_state
                
            # Aktualisiert die Zeit relativ zur Startzeit
            rel_time = time.time()-start_time
        
        # Wiederholt dasselbe in Umgekehrter Richtung, bis Schalter wieder entlastet sind
        gpio.output(self.mx.dir_pin, 0)
        gpio.output(self.my.dir_pin, 1)
        
        # Führt Bewegung mit langsamerer Geschwindigkeit von 30fps aus
        stepdur = 1.0/30/self.steps_per_fstep
        sin_factor = 2*math.pi/stepdur
        
        start_time = time.time()
        rel_time = 0
        rel_time = time.time()-start_time
        
        while gpio.input(self.x_switch_pin) == 1 or gpio.input(self.y_switch_pin) == 1:
            
            calc_pin_state = int(math.sin(rel_time*sin_factor)>0)
            
            if pin_state != calc_pin_state:
                
                if gpio.input(self.x_switch_pin) == 1:
                        gpio.output(self.mx.stp_pin, calc_pin_state)

                if gpio.input(self.y_switch_pin) == 1:
                        gpio.output(self.my.stp_pin, calc_pin_state)

                pin_state = calc_pin_state
                
            rel_time = time.time()-start_time

        # Deaktiviert die Step-Pins
        gpio.output(self.mx.stp_pin, 0)
        gpio.output(self.my.stp_pin, 0)
        # Aktualisiert die State-Variable
        self.current_state.update({'x': 0, 'y': 0})
        time.sleep(1)
                        

    def linear_move(self, cmd):  # Lässt den Roboter zu einem bestimmten Punkt fahren
        # Berechnet Strecke für X-Motor Y-Motor und Strokestrecke
        distance = {'x': cmd['x'] - self.current_state['x'], 'y': cmd['y'] - self.current_state['y']}
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
        
        x_left_steps = x_stepcount
        y_left_steps = y_stepcount

        
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
        
        
        # Führt das selbe aus, wie home_pos(), nur mit zwei unterschiedlich gestreckten
        # Sinusfunktionen, jede für einen Motor, und ohne Schalterprüfung
        start_time = time.time()
        x_pin_state = 0
        y_pin_state = 0
        rel_time = time.time()-start_time
        
        # Wiederholt, solange die erwartete Strokedauer nicht erreicht ist
        while rel_time<stroke_duration:
                               
            x_calc_pin_state = int(math.sin(rel_time*x_sin_factor)>0)
            y_calc_pin_state = int(math.sin(rel_time*y_sin_factor)>0)
            
            if x_pin_state != x_calc_pin_state:
                gpio.output(self.mx.stp_pin, x_calc_pin_state)
                x_pin_state = x_calc_pin_state
                x_left_steps -= x_calc_pin_state

            if y_pin_state != y_calc_pin_state:
                gpio.output(self.my.stp_pin, y_calc_pin_state)
                y_pin_state = y_calc_pin_state
                y_left_steps -= y_calc_pin_state
                
            rel_time = time.time()-start_time
            
        
        # Aktualisiert die State-Variable mit dem neuen Punkt
        self.current_state['x'] = cmd['x']
        self.current_state['y'] = cmd['y']
        x_lost_steps_per_1000_fsteps = 0
        y_lost_steps_per_1000_fsteps = 0
        if distance['x'] != 0:
            x_lost_steps_per_1000_fsteps = x_left_steps * (1000 / distance['x'])
        if distance['y'] != 0:
            y_lost_steps_per_1000_fsteps = y_left_steps * (1000 / distance['y'])
        print('x loss per 1000 fstps:', x_lost_steps_per_1000_fsteps, 'y loss per 1000 fstps', y_lost_steps_per_1000_fsteps)
        return x_lost_steps_per_1000_fsteps, y_lost_steps_per_1000_fsteps

    def enable(self): # Aktiviert die Schrittmotoren
        self.mx.set_enable_state(0)
        self.my.set_enable_state(0)

    def disable(self): # Deaktiviert die Schrittmotoren
        self.mx.set_enable_state(1)
        self.my.set_enable_state(1)
        

    def draw_cmd_list(self, cmd_list): # Nimmt eine cmd_list entgegen und lässt den Roboter diese Zeichnen
        self.enable()
        # Hebt den Stift für die Bewegung zum Nullpunkt und aktualisiert State-Variable
        self.mservo.raise_pen()
        self.current_state.update({'mode': 'moveto'})
        self.home_pos()
        
        x_lost = 0
        y_lost = 0
        
        # Durchläuft jeden Command in der cmd_list
        for cmd in cmd_list:
            print(cmd)
            # Aktualisiert den Pen-State, wenn nötig
            if self.current_state['mode'] != cmd['mode']:
                if cmd['mode'] == 'lineto':
                    self.mservo.lower_pen()
                elif cmd['mode'] == 'moveto':
                    self.mservo.raise_pen()
                self.current_state['mode'] = cmd['mode']
                
            # Ruft Funktion auf, welche den Roboter zum gewünschten Punkt fahren lässt
            x_lost_steps_per_1000_fsteps, y_lost_steps_per_1000_fsteps = self.linear_move(cmd)
            x_lost += x_lost_steps_per_1000_fsteps
            y_lost += y_lost_steps_per_1000_fsteps
        # Hebt den Stift für die Bewegung zum Nullpunkt
        self.mservo.raise_pen()
        self.home_pos()
        self.mservo.stop()
        self.disable()
        
        avg_lost_x_steps = x_lost / len(cmd_list)
        avg_lost_y_steps = y_lost / len(cmd_list)
        
        return avg_lost_x_steps, avg_lost_y_steps

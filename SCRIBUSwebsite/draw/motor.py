# Importiert benötigte Module
import RPi.GPIO as gpio
import pigpio
import time

# Erstellt pi Instanz von pigpio
pi = pigpio.pi()

# Deaktiviert Warnungen
gpio.setwarnings(False)
# Legt Pinbenennung auf GPIO-Nummern fest (alternativ gpio.BOARD für Pin-Nummern)
gpio.setmode(gpio.BCM)

# Definiert die Stepper-Klasse, von der Stepper-Instanzen erstellt werden können
class Stepper:
    # Wird bei Instanziierung ausgeführt, nimmt entsprechende GPIO-Nummern entgegen
    def __init__(self, dir_pin, ena_pin, stp_pin):
        # Legt Direction-, Enable-, Step-Pin fest
        self.dir_pin = dir_pin
        self.ena_pin = ena_pin
        self.stp_pin = stp_pin

        # Konfiguriert Pins als Outputs
        gpio.setup(self.dir_pin, gpio.OUT)
        gpio.setup(self.ena_pin, gpio.OUT)
        gpio.setup(self.stp_pin, gpio.OUT)
        
        # Deaktiviert den Motor
        self.set_enable_state(1)
        
    # Funktion zum (De-)Aktivieren des Motors
    def set_enable_state(self, ena_state):  # 0=enabled/1=disabled
        gpio.output(self.ena_pin, ena_state)

# Definiert die Servo-Klasse, von der Servo-Instanzen erstellt werden können
class Servo:
    # Wird bei Instanziierung ausgeführt, nimmt GPIO-Nummer und optional PWM-Frequenz entgegen
    def __init__(self, pwm_pin, pwm_freq=50):
        self.pwm_pin = pwm_pin
        self.pwm_frequency = pwm_freq
        
        # Konfiguriert PWM-Pin
        pi.set_PWM_frequency(self.pwm_pin, self.pwm_frequency)
        
    # Verschiedene Funktionen zum Ansteuern des Servo-Motors
    def raise_pen(self):
        pi.set_servo_pulsewidth(self.pwm_pin, 1000)
        time.sleep(0.25)

    def lower_pen(self):
        pi.set_servo_pulsewidth(self.pwm_pin, 2000)
        time.sleep(0.25)

    def stop(self):
        pi.set_servo_pulsewidth(self.pwm_pin, 0)

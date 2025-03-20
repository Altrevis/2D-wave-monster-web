import RPi.GPIO as GPIO
import time

# Configuration des GPIO
BUTTON_PIN = 17  # Numéro du pin pour le bouton poussoir
JOYSTICK_X_PIN = 27  # Numéro du pin pour l'axe X du joystick
JOYSTICK_Y_PIN = 22  # Numéro du pin pour l'axe Y du joystick

# Initialisation de la bibliothèque GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)  # Bouton poussoir avec résistance de pull-up
GPIO.setup(JOYSTICK_X_PIN, GPIO.IN)  # Joystick X
GPIO.setup(JOYSTICK_Y_PIN, GPIO.IN)  # Joystick Y

# Fonction pour gérer l'appui sur le bouton poussoir
def button_pressed(channel):
    print("Le bouton poussoir a été pressé!")
    # Ajoutez ici la logique pour votre jeu

# Attacher une interruption pour détecter l'appui sur le bouton
GPIO.add_event_detect(BUTTON_PIN, GPIO.FALLING, callback=button_pressed, bouncetime=200)

# Fonction pour lire les mouvements du joystick
def read_joystick():
    # Lire l'axe X du joystick
    joystick_x = GPIO.input(JOYSTICK_X_PIN)
    # Lire l'axe Y du joystick
    joystick_y = GPIO.input(JOYSTICK_Y_PIN)
    
    # Afficher les valeurs des axes
    print(f"Position du Joystick: X = {joystick_x}, Y = {joystick_y}")
    
    # Ajoutez ici la logique pour votre jeu, selon la position du joystick

# Boucle principale
try:
    while True:
        read_joystick()  # Lire la position du joystick
        time.sleep(0.1)  # Petit délai pour réduire l'utilisation du CPU
except KeyboardInterrupt:
    print("Arrêt du programme.")
finally:
    GPIO.cleanup()  # Nettoyage des GPIO à la fin

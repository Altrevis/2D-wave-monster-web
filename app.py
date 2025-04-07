# Importation des bibliothèques nécessaires
import serial
import threading
from flask import Flask, send_from_directory
from flask_socketio import SocketIO
import time
import os
from flask import Flask, jsonify, request

# Configuration de Flask et SocketIO
app = Flask(__name__)
socketio = SocketIO(app)

# Configuration de la connexion à Arduino
arduino_port = '/dev/ttyACM0'  # Remplacez par votre port COM
baud_rate = 9600
ser = serial.Serial(arduino_port, baud_rate, timeout=1)

# Fonction pour lire les données de Arduino
if ser.in_waiting > 0:
    ser.reset_input_buffer()  # Vidage du buffer
    line = ser.readline().decode('utf-8').strip()
def read_from_arduino():
    # Boucle infinie pour lire les données de Arduino
    while True:
        try:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                if line:
                    print(f"Réception des données de Arduino : {line}")
                    socketio.emit('arduino_data', {'data': line})
        except serial.SerialException as e:
            print(f"Erreur de lecture de Arduino : {e}")
            time.sleep(100)  # Attente avant de réessayer
        except UnicodeDecodeError:
            continue

# Routes pour les fichiers HTML
@app.route('/')
def index():
    # Envoi du fichier index.html
    return send_from_directory('.', 'index.html')

@app.route('/game.html')
def game():
    # Envoi du fichier game.html
    return send_from_directory('./', 'game.html')

@app.route('/game-over.html')
def game_over():
    # Envoi du fichier game-over.html
    return send_from_directory('.', 'game-over.html')

@app.route('/setting.html')
def setting():
    # Envoi du fichier setting.html
    return send_from_directory('.', 'setting.html')

# Route pour les fichiers statiques (CSS, JS, images, etc.)
@app.route('/<path:filename>')
def serve_static(filename):
    # Envoi du fichier statique
    root_dir = os.path.dirname(os.path.abspath(__file__))
    return send_from_directory(root_dir, filename)

# Lancement du thread pour lire les données de Arduino
thread = threading.Thread(target=read_from_arduino)
thread.daemon = True
thread.start()

# Lancement de l'application Flask
if __name__ == '__main__':
    print("Lancement du serveur...")
    socketio.run(app, debug=True)

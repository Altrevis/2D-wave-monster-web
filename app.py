from flask import Flask, jsonify, request
import joblib  # Pour charger le modèle sauvegardé

app = Flask(__name__)

# Charge ton modèle de machine learning à partir d'un fichier
model = joblib.load('mon_modele.pkl')  # Assure-toi d'avoir un modèle enregistré en .pkl

@app.route('/api/data', methods=['GET'])
def get_data():
    # Par exemple, on peut prédire avec des données statiques pour simplifier
    prediction = model.predict([[1, 2, 3]])  # Remplace par tes données réelles
    return jsonify({'prediction': prediction.tolist()})

if __name__ == '__main__':
    app.run(debug=True)

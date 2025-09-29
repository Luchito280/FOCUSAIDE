import numpy as np
from sklearn.linear_model import LinearRegression

class Calibrator:
    def __init__(self):
        self.calibration_data = []
        self.model = None

    def add_point(self, features, screen_coords):
        self.calibration_data.append({
            "features": features,
            "screen_coords": screen_coords
        })
        print(f"Punto de calibración {len(self.calibration_data)} guardado.")

    def calculate_model(self):
        if len(self.calibration_data) < 5:
            print("No hay suficientes puntos de calibración para crear un modelo preciso.")
            return False

        X = np.array([d['features'] for d in self.calibration_data])
        y = np.array([d['screen_coords'] for d in self.calibration_data])
        
        self.model = LinearRegression()
        self.model.fit(X, y)
        print("¡ÉXITO! Modelo de calibración multivariable calculado.")
        return True

    def predict_screen_coords(self, features):
        if self.model is None:
            return None
        
        prediction = self.model.predict(np.array(features).reshape(1, -1))
        return {"x": prediction[0][0], "y": prediction[0][1]}

    def reset(self):
        self.calibration_data = []
        self.model = None
        print("Calibración reseteada.")
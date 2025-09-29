import cv2
import dlib
import json
import time

# --- Configuración ---
SHAPE_PREDICTOR_PATH = 'engine/shape_predictor_68_face_landmarks.dat'
print("Iniciando FOCUSAIDE Engine v2.0 (Stdout-Mode)...", flush=True)

# --- Inicialización de Dlib ---
try:
    detector = dlib.get_frontal_face_detector()
    predictor = dlib.shape_predictor(SHAPE_PREDICTOR_PATH)
except Exception as e:
    print(json.dumps({"error": f"No se pudo cargar dlib: {e}"}), flush=True)
    exit()

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print(json.dumps({"error": "No se puede abrir la cámara."}), flush=True)
    exit()

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        frame_height, frame_width, _ = frame.shape
        frame_center_x = frame_width // 2
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR_GRAY)
        faces = detector(gray)
        is_distracted = True

        for face in faces:
            landmarks = predictor(gray, face)
            nose_point = (landmarks.part(30).x, landmarks.part(30).y)
            distraction_threshold = 150
            
            is_distracted = abs(nose_point[0] - frame_center_x) > distraction_threshold
            break # Solo procesar la primera cara

        # Enviar el resultado como una línea de texto JSON
        # 'flush=True' es MUY importante para que se envíe inmediatamente
        print(json.dumps({"distracted": is_distracted}), flush=True)
        
        # Pequeña pausa para no usar el 100% del CPU
        time.sleep(0.05)

except KeyboardInterrupt:
    print("Motor detenido manualmente.", flush=True)
finally:
    # Este bloque se asegura de liberar la cámara al cerrar
    print("Cerrando recursos...", flush=True)
    cap.release()
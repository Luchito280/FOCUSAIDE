import cv2
import dlib
import asyncio
import websockets
import json
import time

print("Iniciando FOCUSAIDE Engine...")

# --- Constantes ---
FACE_LOST_THRESHOLD_SEC = 3.5 

# --- Inicialización ---
detector = dlib.get_frontal_face_detector()
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Error: No se pudo abrir la cámara.")
    exit()

# --- Lógica Principal y Servidor ---
async def attention_handler(websocket):
    print("Cliente conectado. Iniciando monitoreo.")
    face_lost_time = None
    is_distracted = False
    
    try:
        # Al conectar, asumimos que está enfocado hasta que se demuestre lo contrario
        await websocket.send(json.dumps({"status": "focused"}))
        
        while True:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.1)
                continue

            # Para optimizar, procesamos una imagen más pequeña
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = detector(gray, 0)

            if faces:
                # Si se detecta una cara, estamos enfocados
                if face_lost_time is not None or is_distracted:
                    print("Rostro detectado. Estado: Enfocado.")
                    await websocket.send(json.dumps({"status": "focused"}))
                face_lost_time = None
                is_distracted = False
            else:
                # Si no se detecta una cara, empezamos a contar
                if face_lost_time is None:
                    print("Rostro perdido. Iniciando contador de distracción...")
                    face_lost_time = time.time()
                
                # Si ha pasado suficiente tiempo, marcamos como distraído
                if not is_distracted and (time.time() - face_lost_time > FACE_LOST_THRESHOLD_SEC):
                    print("¡Alerta de distracción enviada!")
                    await websocket.send(json.dumps({"status": "distracted", "reason": "No se detecta el rostro"}))
                    is_distracted = True

            await asyncio.sleep(0.2) # Analizamos 5 veces por segundo, es más que suficiente

    except websockets.exceptions.ConnectionClosed:
        print("Cliente desconectado.")
    finally:
        print("Handler finalizado.")

async def main():
    print(f"Servidor WebSocket iniciado en ws://localhost:8765")
    async with websockets.serve(attention_handler, "localhost", 8765):
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nDeteniendo motor...")
    finally:
        print("Liberando recursos...")
        cap.release()

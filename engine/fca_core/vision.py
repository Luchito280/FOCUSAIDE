import cv2
import dlib
import numpy as np

class VisionProcessor:
    def __init__(self):
        self.detector = dlib.get_frontal_face_detector()
        self.predictor = None
        self.model_points = np.array([
            (0.0, 0.0, 0.0),
            (0.0, -330.0, -65.0),
            (-225.0, 170.0, -135.0),
            (225.0, 170.0, -135.0),
            (-150.0, -150.0, -125.0),
            (150.0, -150.0, -125.0)
        ], dtype=np.float64)

    def load_models(self, predictor_path):
        try:
            print("[Engine] Cargando modelo de landmarks...")
            self.predictor = dlib.shape_predictor(predictor_path)
            print("[Engine] ¡Modelo de IA cargado!")
            return True
        except Exception as e:
            print(f"[Engine] Error fatal al cargar el predictor de dlib: {e}")
            return False

    def get_gaze_ratio(self, eye_points, gray_frame):
        padding = 5
        x, y, w, h = cv2.boundingRect(eye_points)
        if w == 0 or h == 0: return None
        eye_roi = gray_frame[y-padding:y+h+padding, x-padding:x+w+padding]
        roi_h, roi_w = eye_roi.shape
        if roi_w == 0 or roi_h == 0: return None
        _, threshold_eye = cv2.threshold(eye_roi, 60, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        if contours:
            (cx_local, cy_local), _ = cv2.minEnclosingCircle(contours[0])
            return (cx_local / roi_w if roi_w > 0 else 0, cy_local / roi_h if roi_h > 0 else 0)
        return None

    def process_frame(self, frame, precomputed_face=None):
        if not self.predictor:
            return None

        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        if precomputed_face:
            face = precomputed_face
        else:
            faces = self.detector(gray_frame)
            if not faces: return None
            face = faces[0]

        landmarks = self.predictor(gray_frame, face)
        
        image_points = np.array([(landmarks.part(30).x, landmarks.part(30).y), (landmarks.part(8).x, landmarks.part(8).y), (landmarks.part(36).x, landmarks.part(36).y), (landmarks.part(45).x, landmarks.part(45).y), (landmarks.part(48).x, landmarks.part(48).y), (landmarks.part(54).x, landmarks.part(54).y)], dtype=np.float64)
        size = frame.shape
        camera_matrix = np.array([[size[1], 0, size[1]/2], [0, size[1], size[0]/2], [0, 0, 1]], dtype=np.float64)
        (success, rot_vec, trans_vec) = cv2.solvePnP(self.model_points, image_points, camera_matrix, np.zeros((4,1)), flags=cv2.SOLVEPNP_ITERATIVE)

        left_eye_pts = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(36, 42)])
        right_eye_pts = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(42, 48)])
        left_gaze = self.get_gaze_ratio(left_eye_pts, gray_frame)
        right_gaze = self.get_gaze_ratio(right_eye_pts, gray_frame)

        if left_gaze is None or right_gaze is None: return None
        
        gaze_ratio_x = (left_gaze[0] + right_gaze[0]) / 2
        gaze_ratio_y = (left_gaze[1] + right_gaze[1]) / 2

        return {
            "gaze_ratio_x": gaze_ratio_x,
            "gaze_ratio_y": gaze_ratio_y,
            "head_rot_y": rot_vec[1][0],
        }
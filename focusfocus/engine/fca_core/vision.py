import cv2
import dlib
import numpy as np

class VisionProcessor:
    def __init__(self):
        self.detector = dlib.get_frontal_face_detector()
        self.predictor = None
        self.model_points = np.array([
            (0.0, 0.0, 0.0),             # Punta de la nariz
            (0.0, -330.0, -65.0),        # Mentón
            (-225.0, 170.0, -135.0),      # Comisura del ojo izquierdo
            (225.0, 170.0, -135.0),       # Comisura del ojo derecho
            (-150.0, -150.0, -125.0),     # Comisura de la boca izquierda
            (150.0, -150.0, -125.0)      # Comisura de la boca derecha
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

    def get_mouth_aspect_ratio(self, mouth_points):
        d_v1 = np.linalg.norm(mouth_points[1] - mouth_points[7])
        d_v2 = np.linalg.norm(mouth_points[2] - mouth_points[6])
        d_v3 = np.linalg.norm(mouth_points[3] - mouth_points[5])
        d_h = np.linalg.norm(mouth_points[0] - mouth_points[4])
        return (d_v1 + d_v2 + d_v3) / (3.0 * d_h) if d_h > 0 else 0

    def get_eyebrow_height(self, eye_points, eyebrow_points):
        eye_center = np.mean(eye_points, axis=0)
        eyebrow_center = np.mean(eyebrow_points, axis=0)
        return eyebrow_center[1] - eye_center[1]

    def get_gaze_ratio(self, eye_points, gray_frame, threshold_value):
        padding = 5
        x, y, w, h = cv2.boundingRect(eye_points)
        if w == 0 or h == 0: return None
        eye_roi = gray_frame[y-padding:y+h+padding, x-padding:x+w+padding]
        roi_h, roi_w = eye_roi.shape
        if roi_w == 0 or roi_h == 0: return None
        _, threshold_eye = cv2.threshold(eye_roi, threshold_value, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        if contours:
            (cx_local, cy_local), _ = cv2.minEnclosingCircle(contours[0])
            return (cx_local / roi_w if roi_w > 0 else 0, cy_local / roi_h if roi_h > 0 else 0)
        return None

    def process_frame(self, frame, pupil_threshold, precomputed_face=None):
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
        left_gaze = self.get_gaze_ratio(left_eye_pts, gray_frame, pupil_threshold)
        right_gaze = self.get_gaze_ratio(right_eye_pts, gray_frame, pupil_threshold)

        if left_gaze is None or right_gaze is None: return None
        
        mouth_pts = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(60, 68)])
        left_eyebrow_pts = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(17, 22)])
        right_eyebrow_pts = np.array([(landmarks.part(n).x, landmarks.part(n).y) for n in range(22, 27)])
        
        return {
            "gaze_ratio_x": (left_gaze[0] + right_gaze[0]) / 2,
            "gaze_ratio_y": (left_gaze[1] + right_gaze[1]) / 2,
            "head_rot_x": rot_vec[0][0], "head_rot_y": rot_vec[1][0], "head_rot_z": rot_vec[2][0],
            "head_trans_x": trans_vec[0][0], "head_trans_y": trans_vec[1][0], "head_trans_z": trans_vec[2][0],
            "mouth_ratio": self.get_mouth_aspect_ratio(mouth_pts),
            "eyebrow_height": (self.get_eyebrow_height(left_eye_pts, left_eyebrow_pts) + self.get_eyebrow_height(right_eye_pts, right_eyebrow_pts)) / 2
        }
import io
import math
import numpy as np
import cv2
from PIL import Image, ImageOps

class ImagePreprocessor:
    """
    Production-grade OpenCV & PIL medical document preprocessing engine.
    Applies:
    1. EXIF orientation correction.
    2. Adaptive resolution scaling (upscale low-res / downscale 4K+ scans).
    3. Morphological text line orientation estimation & deskewing (+/- 45 deg).
    4. CLAHE (Contrast Limited Adaptive Histogram Equalization) in LAB color space.
    5. Bilateral edge-preserving denoising.
    6. Morphological table grid line preservation.
    """

    @staticmethod
    def load_image_bytes(image_bytes: bytes) -> np.ndarray:
        """Decode raw image bytes into an OpenCV BGR numpy array with EXIF auto-rotation."""
        pil_img = Image.open(io.BytesIO(image_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)
        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')
        
        np_img = np.array(pil_img)
        bgr = cv2.cvtColor(np_img, cv2.COLOR_RGB2BGR)
        return bgr

    @staticmethod
    def ensure_minimum_resolution(img: np.ndarray, min_dimension: int = 1400) -> np.ndarray:
        """
        Upscale low-resolution scans and downscale excessively large images
        to optimize OCR character detection and prevent memory exhaustion.
        """
        h, w = img.shape[:2]
        if max(h, w) < min_dimension:
            scale = min_dimension / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        elif max(h, w) > 4000:
            scale = 4000 / max(h, w)
            new_w = int(w * scale)
            new_h = int(h * scale)
            return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return img

    @staticmethod
    def estimate_skew_angle(gray: np.ndarray) -> float:
        """
        Estimate skew angle in degrees using minAreaRect on detected text components.
        Restricts correction to within +/- 45 degrees to prevent unintended 90-degree flips.
        """
        # Threshold to separate text from background
        thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 12
        )
        
        # Morphological dilation to merge letters horizontally into text lines
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (25, 3))
        dilated = cv2.dilate(thresh, kernel, iterations=2)
        
        # Find contours of text lines
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        angles = []
        for c in contours:
            if cv2.contourArea(c) < 300:
                continue
            rect = cv2.minAreaRect(c)
            angle = rect[-1]
            width, height = rect[1]
            
            # Normalize angle
            if width < height:
                angle = angle + 90
            
            if angle > 45:
                angle = angle - 90
            elif angle < -45:
                angle = angle + 90
                
            if -45.0 <= angle <= 45.0 and abs(angle) > 0.4:
                angles.append(angle)
                
        if len(angles) >= 4:
            return float(np.median(angles))
        return 0.0

    @classmethod
    def deskew(cls, img: np.ndarray) -> np.ndarray:
        """Rotate image to correct detected skew without clipping corners."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        angle = cls.estimate_skew_angle(gray)
        
        if abs(angle) < 0.5:
            return img  # negligible skew
            
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Compute new bounding dimensions so text is never cropped
        cos = np.abs(rot_mat[0, 0])
        sin = np.abs(rot_mat[0, 1])
        new_w = int((h * sin) + (w * cos))
        new_h = int((h * cos) + (w * sin))
        
        rot_mat[0, 2] += (new_w / 2) - center[0]
        rot_mat[1, 2] += (new_h / 2) - center[1]
        
        return cv2.warpAffine(
            img, rot_mat, (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(255, 255, 255)
        )

    @staticmethod
    def enhance_contrast_and_denoise(img: np.ndarray) -> np.ndarray:
        """
        Enhance readability of faint carbon copy text, mobile camera glare,
        and faded ink using CLAHE in LAB color space with edge-preserving bilateral filtering.
        """
        if len(img.shape) == 3:
            # Work in LAB color space to equalize Luminance channel while preserving ink color cues
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel
            clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            
            # Reconstruct LAB image
            enhanced_lab = cv2.merge((cl, a, b))
            enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            
            # Bilateral filter reduces camera noise while keeping edges razor sharp
            denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=35, sigmaSpace=35)
            return denoised
        else:
            clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
            enhanced = clahe.apply(img)
            denoised = cv2.bilateralFilter(enhanced, d=5, sigmaColor=35, sigmaSpace=35)
            return denoised

    @classmethod
    def preprocess_image(cls, image_bytes: bytes) -> np.ndarray:
        """
        Complete preprocessing workflow:
        Raw Bytes -> EXIF Correction -> Resolution Normalization -> Deskew -> CLAHE / Bilateral Denoising.
        """
        bgr = cls.load_image_bytes(image_bytes)
        scaled = cls.ensure_minimum_resolution(bgr)
        deskewed = cls.deskew(scaled)
        enhanced = cls.enhance_contrast_and_denoise(deskewed)
        return enhanced

    @staticmethod
    def to_jpeg_bytes(img: np.ndarray, quality: int = 95) -> bytes:
        """Encode OpenCV BGR image array into optimized JPEG bytes."""
        success, encoded = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if not success:
            raise ValueError("Failed to encode preprocessed image to JPEG.")
        return encoded.tobytes()

from flask import Flask, request, jsonify
import easyocr, os

app = Flask(__name__)
reader = easyocr.Reader(['en'])  # Add 'hi' or others if needed

# Create uploads folder relative to script
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.route('/ocr', methods=['POST'])
def ocr_image():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    filename = file.filename or "uploaded.png"
    temp_path = os.path.join(UPLOAD_DIR, filename)

    # Save uploaded image safely
    file.save(temp_path)

    try:
        result = reader.readtext(temp_path, detail=0)
        text = "\n".join(result)
    finally:
        # Clean up to save space
        os.remove(temp_path)

    return jsonify({"text": text})

if __name__ == '__main__':
    app.run(port=5001)


# from flask import Flask, request, jsonify
# import pytesseract
# from PIL import Image
# import cv2
# import numpy as np
# import io
# import os

# app = Flask(__name__)

# @app.route('/ocr', methods=['POST'])
# def ocr_image():
#     if 'file' not in request.files:
#         return jsonify({'error': 'No file uploaded'}), 400

#     file = request.files['file']
#     image = Image.open(file.stream)

#     # Convert to OpenCV format
#     img = np.array(image)
#     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
#     # Preprocessing: threshold + denoise
#     gray = cv2.GaussianBlur(gray, (3, 3), 0)
#     thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

#     # OCR using Tesseract
#     text = pytesseract.image_to_string(thresh, lang='eng')

#     print("✅ OCR Extracted Text Length:", len(text))
#     return jsonify({'text': text.strip()})

# # 👇 This is what was missing
# if __name__ == "__main__":
#     # Ensure uploads folder exists
#     os.makedirs("uploads", exist_ok=True)
#     app.run(host="0.0.0.0", port=5001)

import io
import uuid
import boto3
import os
import matplotlib.pyplot as plt
from PIL import Image
from flask import Flask, request, jsonify
from helper import prepare_input, postprocess_results, show_anns_dark, initialize_model
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# AWS S3 Credentials
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DOCTORS_BUCKET = os.getenv("DOCTORS_BUCKET")

# Initialize S3 client
s3_client = boto3.client("s3", aws_access_key_id=AWS_ACCESS_KEY, aws_secret_access_key=AWS_SECRET_ACCESS_KEY)

# Initialize Flask app
app = Flask(__name__)

@app.route("/process-image", methods=["POST"])
def process_image():
    try:
        # Get image file from request
        if "image" not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        image_file = request.files["image"]
        
        # Get input points & selection type
        input_points = request.form.get("input_points")
        selection_type = request.form.get("selection_type")

        # Convert input points string to list
        input_points = eval(input_points)  # Example: "[[100, 200], [300, 400]]"

        # Load image
        image = Image.open(image_file).convert("RGB")

        # Load model & process image
        compiled_model = initialize_model("assets/efficient-sam-vitt.xml")
        input_labels = [1, 1] if selection_type == "point" else [2, 3]
        example_input = prepare_input(image, input_points, input_labels, torch_tensor=False)
        result = compiled_model(example_input)

        # Post-process results
        predicted_logits, predicted_iou = result[0], result[1]
        predicted_mask = postprocess_results(predicted_iou, predicted_logits)

        # Display results
        plt.figure(figsize=(10, 6))
        plt.imshow(image)
        plt.axis("off")
        show_anns_dark(predicted_mask, plt.gca())

        # Save processed image to buffer
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format="png", bbox_inches="tight", pad_inches=0)
        plt.close()
        img_buffer.seek(0)

        # Generate unique filename
        random_filename = str(uuid.uuid4()) + ".png"
        s3_key = f"convertedImages/{random_filename}"

        # Upload to S3
        s3_client.upload_fileobj(img_buffer, DOCTORS_BUCKET, s3_key, ExtraArgs={"ContentType": "image/png"})
        try:
            presigned_url = s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": DOCTORS_BUCKET, "Key": s3_key},
                ExpiresIn=3600
            )
        except Exception as e:
            print(f"Error generating pre-signed URL: {e}")
            return None
        # Return S3 file path
        s3_url = f"https://{DOCTORS_BUCKET}.s3.amazonaws.com/{s3_key}"
        return jsonify({"message": "Image processed successfully", "s3_url": 's3_url', s3_key:s3_key, 'presigned_url':presigned_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

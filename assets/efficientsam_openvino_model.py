import sys
import boto3
import os
import io
import base64
from PIL import Image
import matplotlib.pyplot as plt
import uuid
import shutil
from botocore.exceptions import NoCredentialsError
from helper import (
    prepare_input,
    postprocess_results,
    show_anns_dark,
    initialize_model
)
from dotenv import load_dotenv
load_dotenv()

AWS_ACCESS_KEY =  os.getenv('AWS_ACCESS_KEY')
AWS_SECRET_ACCESS_KEY =  os.getenv('AWS_SECRET_ACCESS_KEY')
DOCTORS_BUCKET =  os.getenv('DOCTORS_BUCKET')


model_path = os.path.join(os.getcwd(), "assets", "efficient-sam-vitt.xml")
compiled_model = initialize_model(model_path)

def model_call_function(image, input_points, type_of_selection, bucket_name, aws_access_key, aws_secret_key):
    try:
        # image = Image.open(image_path)
        # image = image.convert('RGB')
        # image = Image.open(io.BytesIO(image_buffer)).convert('RGB')

        input_labels = []

        if type_of_selection == 'point':
            input_labels = [1, 1]
        elif type_of_selection == 'box':
            input_labels = [2, 3]

        example_input = prepare_input(image, input_points, input_labels, torch_tensor=False)
        
        # print("Executing compiled_model...")
        result = compiled_model(example_input)
        # print("Model execution successful!")

        predicted_logits, predicted_iou = result[0], result[1]
        predicted_mask = postprocess_results(predicted_iou, predicted_logits)
        
    except Exception as e:
        print("Error in model execution:", e)
        return None

    try:
        plt.figure(figsize=(10, 6))
        plt.imshow(image)
        plt.axis("off")
        show_anns_dark(predicted_mask, plt.gca())

        # Save image in memory (BytesIO) instead of local disk
        img_buffer = io.BytesIO()
        plt.savefig(img_buffer, format="png", bbox_inches="tight", pad_inches=0)
        plt.close()
        img_buffer.seek(0)  # Move pointer to start

        # Generate a unique filename for S3
        random_filename = str(uuid.uuid4()) + ".png"
        s3_key = f"convertedImages/{random_filename}"

        # print(f"Uploading {s3_key} to S3...")

        # Upload to S3
        s3_client = boto3.client("s3", aws_access_key_id=aws_access_key, aws_secret_access_key=aws_secret_key)
        s3_client.upload_fileobj(img_buffer, bucket_name, s3_key, ExtraArgs={"ContentType": "image/png"})
        
        print(s3_key)
        return s3_key

    except Exception as e:
        print("Error uploading to S3:", e)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        type_of_selection = str(sys.argv[5])

        image_bytes = sys.stdin.buffer.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Process input points based on selection type
        input_points = []
        
        if type_of_selection == 'point':
            input_points = [[int(sys.argv[1]), int(sys.argv[2])], [int(sys.argv[3]), int(sys.argv[4])]]
        elif type_of_selection == 'box':
            input_points = [int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])]

      
        model_call_function(image, input_points, type_of_selection,DOCTORS_BUCKET, AWS_ACCESS_KEY,AWS_SECRET_ACCESS_KEY)
    else:
        print("No arguments specified")
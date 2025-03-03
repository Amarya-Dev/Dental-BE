import sys
import boto3
import os
import io
from PIL import Image
import matplotlib.pyplot as plt
import uuid
from botocore.exceptions import NoCredentialsError
from helper import (
    prepare_input,
    postprocess_results,
    show_anns_dark,
    initialize_model
)

# def model_call_function(image_path, input_points, compiled_model, type_of_selection):
#     image = Image.open(image_path)
#     image = image.convert('RGB')

#     input_labels =[]

#     if type_of_selection == 'point':
#         input_labels = [1, 1]
#     elif type_of_selection == 'box':
#         input_labels = [2, 3]

#     example_input = prepare_input(image, input_points, input_labels, torch_tensor=False)
#     try:
#         result = compiled_model(example_input)
#         predicted_logits, predicted_iou = result[0], result[1]
#         predicted_mask = postprocess_results(predicted_iou, predicted_logits)
#     except Exception as e:
#         print("Please recheck the inputted image or Model weights, error raised:", e)
#         return None

#     plt.figure(figsize=(10, 6))
#     plt.imshow(image)
#     plt.axis("off")
#     show_anns_dark(predicted_mask, plt.gca())
    
#     # Generate output path
#     index = image_path.rfind("\\")
#     final_image_path = ""
#     if index != -1:
#         final_image_path = image_path[:index]
#     final_image_path = final_image_path + '\\convertedImage.png'
#     print('saving final image')
#     plt.savefig(final_image_path, bbox_inches='tight', pad_inches=0)
#     plt.close()
    
#     return image
# def upload_to_s3(file_path, bucket_name, s3_key, aws_access_key, aws_secret_key):
#     s3_client = boto3.client(
#         "s3",
#         aws_access_key_id=aws_access_key,
#         aws_secret_access_key=aws_secret_key,
#     )
#     try:
#         s3_client.upload_file(file_path, bucket_name, s3_key)
#         # url = s3_client.generate_presigned_url(
#         #     "get_object",
#         #     Params={"Bucket": bucket_name, "Key": s3_key},
#         #     ExpiresIn=expiration
#         # )
#         # print(f"Presigned URL: {url}")
#         return s3_key
#     except Exception as e:
#         print(f"Error generating presigned URL: {e}")
#         return None
#         # s3_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
#         # print(f"File uploaded successfully: {s3_url}")
#         # return s3_url
#     except Exception as e:
#         print(f"Error uploading to S3: {e}")
#         return None



def model_call_function(image_path, input_points, compiled_model, type_of_selection, bucket_name, aws_access_key, aws_secret_key):
    try:
        image = Image.open(image_path)
        image = image.convert('RGB')

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
        
        # print(f"Successfully uploaded to S3: {s3_key}")
        print(s3_key)
        return s3_key  # Ensure return here

    except Exception as e:
        print("Error uploading to S3:", e)
        return None

if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = str(sys.argv[5])
        # model_path = str(sys.argv[6])
        type_of_selection = str(sys.argv[6])

        # Process input points based on selection type
        
        input_points = []
        
        if type_of_selection == 'point':
            input_points = [[int(sys.argv[1]), int(sys.argv[2])], [int(sys.argv[3]), int(sys.argv[4])]]
        elif type_of_selection == 'box':
            input_points = [int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])]
        
        # print("Processing image:", image_path, input_points)

        # Set up model path
        model_path = 'assets\efficient-sam-vitt.xml'
        sys.path.append(model_path)
        # model_path += '\\efficient-sam-vitt.xml'

        # Initialize and run model
        compiled_model = initialize_model(model_path)
        model_call_function(image_path, input_points, compiled_model, type_of_selection,'bucketbyaws', 'AKIARHJJNG2JPTNEFVPD', '1A+F8CWtaI9OL5WOhFdhPwW1AWWSsqp9pPPv0DDB')
    else:
        print("No arguments specified")
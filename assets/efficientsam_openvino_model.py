import sys
from PIL import Image
import matplotlib.pyplot as plt
from helper import (
    prepare_input,
    postprocess_results,
    show_anns_dark,
    initialize_model
)

def model_call_function(image_path, input_points, compiled_model, type_of_selection):
    image = Image.open(image_path)
    image = image.convert('RGB')

    input_labels =[]

    if type_of_selection == 'point':
        input_labels = [1, 1]
    elif type_of_selection == 'box':
        input_labels = [2, 3]

    example_input = prepare_input(image, input_points, input_labels, torch_tensor=False)
    try:
        result = compiled_model(example_input)
        predicted_logits, predicted_iou = result[0], result[1]
        predicted_mask = postprocess_results(predicted_iou, predicted_logits)
    except Exception as e:
        print("Please recheck the inputted image or Model weights, error raised:", e)
        return None

    plt.figure(figsize=(10, 6))
    plt.imshow(image)
    plt.axis("off")
    show_anns_dark(predicted_mask, plt.gca())
    
    # Generate output path
    index = image_path.rfind("\\")
    final_image_path = ""
    if index != -1:
        final_image_path = image_path[:index]
    final_image_path = final_image_path + '\\convertedImage.png'
    print('saving final image')
    plt.savefig(final_image_path, bbox_inches='tight', pad_inches=0)
    plt.close()
    
    return image

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
        
        print("Processing image:", image_path, input_points)

        # Set up model path
        model_path = 'assets\efficient-sam-vitt.xml'
        sys.path.append(model_path)
        # model_path += '\\efficient-sam-vitt.xml'

        # Initialize and run model
        compiled_model = initialize_model(model_path)
        model_call_function(image_path, input_points, compiled_model, type_of_selection)
    else:
        print("No arguments specified")
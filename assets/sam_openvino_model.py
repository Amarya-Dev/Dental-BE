import warnings
import sys
from pathlib import Path
import numpy as np
import torch
import openvino as ov
import cv2
import matplotlib.pyplot as plt
from copy import deepcopy
from typing import Tuple
from torchvision.transforms.functional import resize, to_pil_image
from typing import Tuple

from helper_fn import (
    preprocess_image,
    postprocess_masks,
    show_mask,
    show_points,
    show_box,
    resizer
)


class SamExportableModel(torch.nn.Module):
    def __init__(
        self,
        model,
        return_single_mask: bool,
        use_stability_score: bool = False,
        return_extra_metrics: bool = False,
    ) -> None:
        super().__init__()
        self.mask_decoder = model.mask_decoder
        self.model = model
        self.img_size = model.image_encoder.img_size
        self.return_single_mask = return_single_mask
        self.use_stability_score = use_stability_score
        self.stability_score_offset = 1.0
        self.return_extra_metrics = return_extra_metrics

    def _embed_points(self, point_coords: torch.Tensor, point_labels: torch.Tensor) -> torch.Tensor:
        point_coords = point_coords + 0.5
        point_coords = point_coords / self.img_size
        point_embedding = self.model.prompt_encoder.pe_layer._pe_encoding(point_coords)
        point_labels = point_labels.unsqueeze(-1).expand_as(point_embedding)

        point_embedding = point_embedding * (point_labels != -1).to(torch.float32)
        point_embedding = point_embedding + self.model.prompt_encoder.not_a_point_embed.weight * (point_labels == -1).to(torch.float32)

        for i in range(self.model.prompt_encoder.num_point_embeddings):
            point_embedding = point_embedding + self.model.prompt_encoder.point_embeddings[i].weight * (point_labels == i).to(torch.float32)

        return point_embedding

    def t_embed_masks(self, input_mask: torch.Tensor) -> torch.Tensor:
        mask_embedding = self.model.prompt_encoder.mask_downscaling(input_mask)
        return mask_embedding

    def mask_postprocessing(self, masks: torch.Tensor) -> torch.Tensor:
        masks = torch.nn.functional.interpolate(
            masks,
            size=(self.img_size, self.img_size),
            mode="bilinear",
            align_corners=False,
        )
        return masks

    def select_masks(self, masks: torch.Tensor, iou_preds: torch.Tensor, num_points: int) -> Tuple[torch.Tensor, torch.Tensor]:
        # Determine if we should return the multiclick mask or not from the number of points.
        # The reweighting is used to avoid control flow.
        score_reweight = torch.tensor([[1000] + [0] * (self.model.mask_decoder.num_mask_tokens - 1)]).to(iou_preds.device)
        score = iou_preds + (num_points - 2.5) * score_reweight
        best_idx = torch.argmax(score, dim=1)
        masks = masks[torch.arange(masks.shape[0]), best_idx, :, :].unsqueeze(1)
        iou_preds = iou_preds[torch.arange(masks.shape[0]), best_idx].unsqueeze(1)

        return masks, iou_preds

    @torch.no_grad()
    def forward(
        self,
        image_embeddings: torch.Tensor,
        point_coords: torch.Tensor,
        point_labels: torch.Tensor,
        mask_input: torch.Tensor = None,
    ):
        sparse_embedding = self._embed_points(point_coords, point_labels)
        if mask_input is None:
            dense_embedding = self.model.prompt_encoder.no_mask_embed.weight.reshape(1, -1, 1, 1).expand(
                point_coords.shape[0], -1, image_embeddings.shape[0], 64
            )
        else:
            dense_embedding = self._embed_masks(mask_input)

        masks, scores = self.model.mask_decoder.predict_masks(
            image_embeddings=image_embeddings,
            image_pe=self.model.prompt_encoder.get_dense_pe(),
            sparse_prompt_embeddings=sparse_embedding,
            dense_prompt_embeddings=dense_embedding,
        )

        if self.use_stability_score:
            scores = calculate_stability_score(masks, self.model.mask_threshold, self.stability_score_offset)

        if self.return_single_mask:
            masks, scores = self.select_masks(masks, scores, point_coords.shape[1])

        upscaled_masks = self.mask_postprocessing(masks)

        if self.return_extra_metrics:
            stability_scores = calculate_stability_score(upscaled_masks, self.model.mask_threshold, self.stability_score_offset)
            areas = (upscaled_masks > self.model.mask_threshold).sum(-1).sum(-1)
            return upscaled_masks, scores, stability_scores, areas, masks

        return upscaled_masks, scores

def model_call_function(image_path, input_points, type_of_selection):
    core = ov.Core()
    #embedding generation
    ov_encoder_path = 'assets\sam_image_encoder.xml'
    ov_encoder_model = core.read_model(ov_encoder_path)
    ov_encoder = core.compile_model(ov_encoder_model, 'AUTO')
    #model prediction
    ov_model_path = 'assets\sam_mask_predictor.xml'
    ov_model = core.read_model(ov_model_path)
    ov_predictor = core.compile_model(ov_model, 'AUTO')

    image = cv2.imread(image_path)
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    preprocessed_image = preprocess_image(image)
    encoding_results = ov_encoder(preprocessed_image)

    image_embeddings = encoding_results[ov_encoder.output(0)]

    if type_of_selection == 'point':
        input_point = np.array([input_points])
        input_label = np.array([1])
        coord = np.concatenate([input_point, np.array([[0.0, 0.0]])], axis=0)[None, :, :]
        label = np.concatenate([input_label, np.array([-1])], axis=0)[None, :].astype(np.float32)
        coord = resizer.apply_coords(coord, image.shape[:2]).astype(np.float32)

    elif type_of_selection == 'box':
        input_box = np.array(input_points)
        input_label = np.array([1])

        box_coords = input_box.reshape(2, 2)
        box_labels = np.array([2, 3])

        coord = np.concatenate([box_coords], axis=0)[None, :, :]
        label = np.concatenate([input_label, box_labels], axis=0)[None, :].astype(np.float32)
        coord = resizer.apply_coords(coord, image.shape[:2]).astype(np.float32)
    

    inputs = {
        "image_embeddings": image_embeddings,
        "point_coords": coord,
        "point_labels": label,
    }

    try:
        results = ov_predictor(inputs)
        masks = results[ov_predictor.output(0)]
        masks = postprocess_masks(masks, image.shape[:-1])
        masks = masks > 0.0
    except Exception as e:
        print("Please recheck the inputted image or Model weights, error raised:", e)
        return None

    plt.figure(figsize=(10, 10))
    plt.imshow(image)
    show_mask(masks, plt.gca())
    # show_points(input_point, input_label, plt.gca())
    plt.axis("off")
    
    index = image_path.rfind("\\")
    final_image_path = ""
    if index != -1:
        final_image_path = image_path[:index]
    final_image_path = final_image_path + '\\convertedImage.png'

    plt.savefig(final_image_path, bbox_inches='tight', pad_inches=0)
    plt.close()

    return image


if __name__ == "__main__":
    if len(sys.argv) > 1:
        image_path = str(sys.argv[5])
        type_of_selection = str(sys.argv[6])

        # Process input points based on selection type
        
        input_points = []
        
        if type_of_selection == 'point':
            input_points = [int(sys.argv[1]), int(sys.argv[2])]
        elif type_of_selection == 'box':
            input_points = [int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])]
        
        print("Processing image:", image_path, input_points, type_of_selection)

        model_call_function(image_path, input_points, type_of_selection)
    else:
        print("No arguments specified")
from pathlib import Path
import numpy as np
import torch
import matplotlib.pyplot as plt
from PIL import Image
import openvino as ov

def prepare_input(input_image, points, labels, torch_tensor=True):
    img_tensor = np.ascontiguousarray(input_image)[None, ...].astype(np.float32) / 255
    img_tensor = np.transpose(img_tensor, (0, 3, 1, 2))
    pts_sampled = np.reshape(np.ascontiguousarray(points), [1, 1, -1, 2])
    pts_labels = np.reshape(np.ascontiguousarray(labels), [1, 1, -1])
    if torch_tensor:
        img_tensor = torch.from_numpy(img_tensor)
        pts_sampled = torch.from_numpy(pts_sampled)
        pts_labels = torch.from_numpy(pts_labels)
    return img_tensor, pts_sampled, pts_labels

def postprocess_results(predicted_iou, predicted_logits):
    sorted_ids = np.argsort(-predicted_iou, axis=-1)
    predicted_iou = np.take_along_axis(predicted_iou, sorted_ids, axis=2)
    predicted_logits = np.take_along_axis(
        predicted_logits, sorted_ids[..., None, None], axis=2
    )
    return predicted_logits[0, 0, 0, :, :] >= 0

def show_points(coords, labels, ax, marker_size=375):
    pos_points = coords[labels == 1]
    neg_points = coords[labels == 0]
    ax.scatter(
        pos_points[:, 0],
        pos_points[:, 1],
        color="green",
        marker="*",
        s=marker_size,
        edgecolor="white",
        linewidth=1.25,
    )
    ax.scatter(
        neg_points[:, 0],
        neg_points[:, 1],
        color="red",
        marker="*",
        s=marker_size,
        edgecolor="white",
        linewidth=1.25,
    )

def show_box(box, ax):
    x0, y0 = box[0], box[1]
    w, h = box[2] - box[0], box[3] - box[1]
    ax.add_patch(
        plt.Rectangle((x0, y0), w, h, edgecolor="yellow", facecolor=(0, 0, 0, 0), lw=5)
    )

def show_anns(mask, ax):
    ax.set_autoscale_on(False)
    img = np.ones((mask.shape[0], mask.shape[1], 4))
    img[:, :, 3] = 0
    color_mask = np.concatenate([np.random.random(3), [0.5]])
    img[mask] = color_mask
    ax.imshow(img)

def show_anns_dark(mask, ax):
    ax.set_autoscale_on(False)
    img_1 = np.ones((mask.shape[0], mask.shape[1], 4))
    img_1[:, :, 3] = 0
    img_1[mask] = (11/255,14/255,19/255,.85)
    ax.imshow(img_1)

def initialize_model(model_path):
    core = ov.Core()
    ov_model_path = Path(model_path)
    ov_model = core.read_model(ov_model_path)
    return core.compile_model(ov_model, 'AUTO')
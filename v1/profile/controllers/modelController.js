import dotenv from "dotenv"
import {validationResult} from "express-validator"
import {spawn} from 'node:child_process';
import multer from 'multer';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { successResponse, errorResponse, notFoundResponse, unAuthorizedResponse, error5Response } from "../../../utils/response.js"
import { generatePresignedUrl } from "../../../utils/upload.js";
dotenv.config();

export const runModel = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File is required" });
        }

        const formData = new FormData();
        const fileBlob = new Blob([req.file.buffer], { type: req.file.mimetype });

        formData.append("file", fileBlob, req.file.originalname);
        formData.append("input_points", JSON.stringify(req.body.inputPoints || [[142, 81], [145, 10]]));
        formData.append("selection_type", req.body.selectionType || "point");

        // const response = await axios.post("http://127.0.0.1:5001/process-image", formData, {
        //     headers: formData.getHeaders() // Ensure this works with "form-data" package
        // });

        if (response.data.s3_key) {
            return successResponse(res, { s3_key: response.data.s3_key }, "Image processed successfully");
        } else {
            throw new Error(response.data.error || "Processing failed");
        }
    } catch (error) {
        return error5Response(res, error, "Error processing image");
    }
};

import dotenv from "dotenv"
import {validationResult} from "express-validator"
import multer from 'multer';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { successResponse, errorResponse, notFoundResponse, unAuthorizedResponse, error5Response } from "../../../utils/response.js"
dotenv.config();

export const runModel = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        let result;
        let command;
        const imagePath = req.file.path; 
        const selectionType = req.body.selectionType; 
        const inputPoints = JSON.parse(req.body.inputPoints || "[[142, 81], [145, 10]]");

        // const response = await axios({
        //     url: imageUrl,
        //     method: 'GET',
        //     responseType: 'stream', // Download as stream
        // });

        // // Set local file path
        // const imagePath = path.join('images', 'xray.jpg');

        // // Ensure directory exists
        // fs.mkdirSync(path.dirname(imagePath), { recursive: true });

        // // Save file
        // const writer = fs.createWriteStream(imagePath);
        // response.data.pipe(writer);

        command = `python assets/efficientsam_openvino_model.py ${inputPoints[0][0]} ${inputPoints[0][1]} ${inputPoints[1][0]} ${inputPoints[1][1]} "${imagePath}" "${selectionType}"`;
        // if(doctorId == 1111){
        //         command = `python assets/efficientsam_openvino_model.py ${inputPoints[0][0]} ${inputPoints[0][1]} ${inputPoints[1][0]} ${inputPoints[1][1]} "${imagePath}" "${selectionType}"`;
        // }else{
        //     command = `python assets/sam_openvino_model.py ${inputPoints[0][0]} ${inputPoints[0][1]} ${inputPoints[1][0]} ${inputPoints[1][1]} "${imagePath}" "${selectionType}"`;
        // }

        console.log(command)
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error.message}`);
                return error5Response(res, "", 'Failed to process image.');
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
                return error5Response(res, "", 'Error in processing..');
            }

            const processedImagePath = path.join('images', 'convertedImage.png');

            // Read the processed image file as a buffer
            fs.readFile(processedImagePath, (readError, imageBuffer) => {
                if (readError) {
                    console.error(`Error reading processed image: ${readError.message}`);
                    return error5Response(res, "", 'Failed to read processed image.');
                }

                // Send the message, image path, and buffer
               result = {
                    message: 'Image processed successfully',
                    imagePath: processedImagePath,
                    imageBuffer: imageBuffer.toString('base64') // Convert buffer to Base64 for JSON response
                };
                return successResponse(res, { image_path : result.imagePath, image_buffer: result.imageBuffer }, result.message);
            });
        });
    } catch (error) {
        next(error);
    }
};

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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        let result;
        let command;
        // const doctorId = req.params.doctor_id
        // const imagePath = req.file.buffer
        const selectionType = req.body.selectionType; 
        const inputPoints = JSON.parse(req.body.inputPoints || "[[142, 81], [145, 10]]");

        const pythonProcess = spawn("python", [
            "assets/efficientsam_openvino_model.py", 
            inputPoints[0][0],
            inputPoints[0][1],
            inputPoints[1][0],
            inputPoints[1][1],
            selectionType
        ]);

        pythonProcess.stdin.write(req.file.buffer);
        pythonProcess.stdin.end();
      
        let outputData = "";
        pythonProcess.stdout.on("data", (data) => {
            outputData += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            console.error(`Error: ${data.toString()}`);
        });

        pythonProcess.on("close", async(code) => {
            // console.log(`Python script exited with code ${code}`);
            // console.log(outputData)
            let s3_Key = outputData.trim();

            try {
                let pre_signed_url = await generatePresignedUrl(s3_Key, "image/png");
                return successResponse(res, { s3_Key, pre_signed_url }, "");
            } catch (error) {
                return error5Response(res, error,  'Failed to generate preSigned Url');
            }
        });
    } catch (error) {
        next(error);
    }
};

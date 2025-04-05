import dotenv from "dotenv"
import {validationResult} from "express-validator"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { successResponse, errorResponse, notFoundResponse, unAuthorizedResponse } from "../../../utils/response.js"
import {patientDetailQuery, patientDataSaveQuery, getDoctorFolderName, getS3FolderNameQuery, insertFileKeyNameQuery, allPatientsFolderNameQuery, getAllFilesSignedUrlQuery, deleteFilesQuery, getKeyNamesByFileIds, insertDoctorFileKeyNameQuery, getConsentAndProsthesisSignedUrlQuery, deleteFilesFromDoctorQuery, getKeyNamesByFileIdsForDoctor} from "../models/patientQuery.js"
import { createSubFolder, deleteMultipleObjects, generatePresignedUrl, listFolderContents, uploadObject } from "../../../utils/upload.js"
dotenv.config();


export const savePatientData = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        const { doctor_id, name, phone_number, age, gender } = req.body;

        const [existingData] = await patientDetailQuery([doctor_id, name, phone_number]);
        console.log(existingData);
        if (existingData.length) {
            return errorResponse(res, '', 'Patient with this name and phone number already exists.');
        }
        let [doctor_folder_name] = await getDoctorFolderName([doctor_id])
        doctor_folder_name = doctor_folder_name[0].folder_name
        let patient_folder_name = name + "_" + phone_number
        await createSubFolder(`${doctor_folder_name}/patients/${patient_folder_name}`, '')
        let current_date = new Date()
        await patientDataSaveQuery([
            doctor_id, 
            name, 
            phone_number,
            `patients/${patient_folder_name}`,
            age, 
            gender,
            current_date,
            current_date,
        ]);

        return successResponse(res, {
            doctor_id, 
            name, 
            phone_number,
            folder_name :`patients/${patient_folder_name}`,
            age, 
            gender
        }, 'Patient folder created successfully!');
    } catch (error) {
        next(error);
    }
};

export const uploadPatientFile = async(req, res, next) =>{
    try {
        const file = req.file;
        const buffer = file.buffer;
        const file_name = file.originalname
        let {patient_id, doctor_id} = req.body;
        let {type}= req.query
        const fileUploadFunction = async (patient_id, doctor_id, type)=>{
            let response;
            let folder_name;
            if(patient_id){
                const [data] = await getS3FolderNameQuery([patient_id, doctor_id]);
                folder_name = data[0].folder_name || ''
            }
            if(type!='files'){
                let [doctor_folder_name] = await getDoctorFolderName([doctor_id])
                doctor_folder_name = doctor_folder_name[0].folder_name
                folder_name= type==='consent'?`${doctor_folder_name}/consent` : type==='prosthesis'?`${doctor_folder_name}/prosthesis`: '';
                response = await uploadObject(file_name, buffer, folder_name);
                await insertDoctorFileKeyNameQuery([doctor_id, response.Key, file.mimetype, type])
            }else{
                response = await uploadObject(file_name, buffer, folder_name);
                await insertFileKeyNameQuery([patient_id, doctor_id, response.Key, file.mimetype])
            }
            return;
        }
        switch (type) {
            case 'files':
                await fileUploadFunction(patient_id, doctor_id, type);
                break;
            case 'consent':
            case 'prosthesis':
                await fileUploadFunction('', doctor_id, type);
                break;
            default:
                return errorResponse(res, "", "Invalid file type");
        }
        return successResponse(res, "", 'Patient file uploaded successfully!');
    } catch (error) {
        next(error);
    }
}

export const deletePatientFile = async(req, res, next) => {
    try {
        let {file_ids, doctor_id, patient_id} = req.body;
        let key_array = [];
        const deletefunc = async(key_names) => {
            for(let i = 0 ; i < key_names.length ; i++) {
                key_array.push(key_names[i].key_name);
            }
            await deleteMultipleObjects(key_array);
        }

        if(!patient_id){
            let [key_names] = await getKeyNamesByFileIdsForDoctor(file_ids);
            await deletefunc(key_names)
            await deleteFilesFromDoctorQuery(doctor_id, key_array);
        }else{
            let [key_names] = await getKeyNamesByFileIds(file_ids);
            await deletefunc(key_names)
            await deleteFilesQuery(patient_id, doctor_id, key_array)
        }
        return successResponse(res, '', 'Patient file deleted successfully!');
    } catch (error) {
        next(error);
    }
}

export const getAllFilesSignedUrlByDoctor = async (req, res, next) => {
    try {
        const { patient_id, doctor_id } = req.query;
        const [db_data] = await getAllFilesSignedUrlQuery([doctor_id, patient_id]);

        // Using Promise.all to generate URLs concurrently
        const url_list = await Promise.all(db_data.map(async ({ file_id, key_name, mime_type }) => ({
            file_id,
            pre_signed_url: await generatePresignedUrl(key_name, mime_type)
        })));

        return successResponse(res, url_list, 'Url generated successfully!');
    } catch (error) {
        next(error);
    }
};

export const getAllConsentAndProsthesisSignedUrl = async (req, res, next) => {
    try {
        const { doctor_id, type } = req.query;
        const [db_data] = await getConsentAndProsthesisSignedUrlQuery([doctor_id, type]);

        // Using Promise.all to generate URLs concurrently
        const url_list = await Promise.all(db_data.map(async ({ file_id, key_name, mime_type }) => ({
            file_id,
            pre_signed_url: await generatePresignedUrl(key_name, mime_type)
        })));

        return successResponse(res, url_list, `${type} Url generated successfully!`);
    } catch (error) {
        next(error);
    }
};

export const allPatientsFolderName = async (req, res, next) => {
    try {
        const { doctor_id } = req.query;
        const [result] = await allPatientsFolderNameQuery([doctor_id]);

        // Using map to create an array directly
        const name_list = result.map(({ folder_name, patient_id }) => ({ folder_name, patient_id }));

        return successResponse(res, name_list, 'Content fetched!');
    } catch (error) {
        next(error);
    }
};

export const getCommonConsentFormAndProthesis = async(req, res, next) =>{
    try {
        const type = req.query.type;
        // if(type!='consent'|| type!='prosthesis'){
        //     return errorResponse(res, '', 'Invalid file type.');
        // }
        // console.log(type)
        const data = await listFolderContents(type);
        let mapped_data = data.filter(object => {
            if(object.Size>0){
                return object.Key
            }
        });
        let mime_type = type=='consent'? 'image/jpg': type=='prosthesis'? 'image/png': 'application/octet-stream';

        let pre_signed_url_data= await Promise.all(mapped_data.map(async(key_name)=>({
            pre_signed_url : await generatePresignedUrl(key_name.Key, mime_type) 
        })))
        return successResponse(res, pre_signed_url_data, `${type} fetched successfully!`);
    } catch (error) {
        next(error);
    }
}
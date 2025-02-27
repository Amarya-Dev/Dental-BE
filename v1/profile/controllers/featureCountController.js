import dotenv from "dotenv"
import {validationResult} from "express-validator"
import { successResponse, errorResponse, notFoundResponse, unAuthorizedResponse, error5Response } from "../../../utils/response.js"
import { getFeatureCountForDoctorQuery, insertFeatureCountQuery, updateFeatureCountQuery } from "../models/featureQuery.js";
dotenv.config();

export const countFeatureLock = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }

        const data = req.body.data
        console.log(data)

        for(let i= 0; i<data.length; i++) {
            let doctor_id = data[i].doctor_id

            let [isExistsData] = await getFeatureCountForDoctorQuery([doctor_id]) ;
            console.log(isExistsData);

            if(isExistsData.length == 0) {
                await insertFeatureCountQuery([ 
                        doctor_id,
                        data[i].line,
                        data[i].square,
                        data[i].text,
                        data[i].pencil,
                        data[i].pen,
                        data[i].marker,
                        data[i].brush,
                        data[i].filling,
                        data[i].point,
                        data[i].box,
                        data[i].prosthesis,
                        data[i].audio
                    ])
            }else{
                await updateFeatureCountQuery([
                    data[i].line,
                    data[i].square,
                    data[i].text,
                    data[i].pencil,
                    data[i].pen,
                    data[i].marker,
                    data[i].brush,
                    data[i].filling,
                    data[i].point,
                    data[i].box,
                    data[i].prosthesis,
                    data[i].audio,
                    doctor_id
                ])
            }
        }
        return successResponse(res, "", 'Feature Count Data added successfully!');;
    
    } catch (error) {
        next(error);
    }
};

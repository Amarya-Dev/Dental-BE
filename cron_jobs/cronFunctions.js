import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from 'path';
import { getPatientAndDoctorFolderNameQuery } from "../v1/profile/models/patientQuery.js";
import { listFolderContents } from "../utils/upload.js";
import { getAllDoctorsIdsQuery } from "../v1/profile/models/userQuery.js";
import { sendMail } from "../config/nodemailer.js";
dotenv.config();


export const deletingFilesFromImages = async () => {
  try {
    const files = await fs.readdir('images');
        for (const file of files) {
            const filePath = path.join('images', file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                await fs.unlink(filePath);
                console.log(`Deleted: ${filePath}`);
            }
        }
        console.log('All files deleted successfully.');
  } catch (error) {
    console.error('Error deleting files:', error);
  }
};

export const checkDoctorsFolderSize = async(doctor_id) => {
    try {

        let data = await getPatientAndDoctorFolderNameQuery([doctor_id])
        let total_doctors_folder_size = 0;

        const getDoctorsFolderSize = async (folder_name) => {
            try {
                const folder_data = await listFolderContents(folder_name);
                return folder_data.reduce((sum, file) => sum + file.Size, 0) / (1024 * 1024);
            } catch (err) {
                console.error(`Error fetching folder size for ${folder_name}:`, err);
                return 0;
            }
        };

        if (Array.isArray(data.patient_folder_name) && data.patient_folder_name.length) {
            for (const patient_folder of data.patient_folder_name) {
                const folder_path = `${data.doctor_folder_name}/${patient_folder}`;
                console.log(folder_path);
                total_doctors_folder_size += await getDoctorsFolderSize(folder_path);
            }
        }

        const fixed_folders = ["consent", "prosthesis"];
        for (const folder of fixed_folders) {
            const folder_path = `${data.doctor_folder_name}/${folder}`;
            total_doctors_folder_size += await getDoctorsFolderSize(folder_path);
        }
        // return successResponse(res, {total_doctors_folder_size}, '');
        return total_doctors_folder_size
    } catch (error) {
      console.error(error);
    }
}

export const sendWarningsToDoctors =async() =>{
  try {
    let [data] = await getAllDoctorsIdsQuery()
    console.log(data);
    for(let i=0; i<data.length; i++) {
      let folder_size = await checkDoctorsFolderSize(data[i]._id)
      // console.log(folder_size);
      let quota_percentage = (folder_size/process.env.FOLDER_SIZE_QUOTA_IN_MB) * 100
      if(quota_percentage>90){
        await sendMail(data[i].email, `You have consumed 90% of your storage quota.`);
      }else if(quota_percentage>50){
        await sendMail(data[i].email, `You have consumed 50% of your storage quota.`);
      }
    }
  } catch (error) {
    console.error(error);
  }
}
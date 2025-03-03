import dotenv from "dotenv"
import {validationResult} from "express-validator"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { sendMail } from "../../../config/nodemailer.js"
import { successResponse, errorResponse, notFoundResponse, unAuthorizedResponse } from "../../../utils/response.js"
import { userDetailQuery, userRegistrationQuery, insertTokenQuery, updateUserPasswordQuery, insertOtpQuery,
     getOtpQuery, userEmailVerificationQuery, insertFolderNameQuery} from "../models/userQuery.js"
import { createSubFolder, listFolderContents } from "../../../utils/upload.js"
import { allPatientsFolderNameQuery, getDoctorFolderName, getPatientAndDoctorFolderNameQuery } from "../models/patientQuery.js"

dotenv.config();


export const userRegistration = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        let { username, email, password } = req.body;
        email = email.toLowerCase();
        const [existingUser] = await userDetailQuery([email]);
        if (existingUser.length) {
            return errorResponse(res, '', 'User with this email already exists.');
        }
        const password_hash = await bcrypt.hash(password.toString(), 12);
        let current_date = new Date()
        const [user_data] = await userRegistrationQuery([
            username,
            email,
            1,
            password_hash,
            current_date,
            current_date
        ]);
        await insertFolderNameQuery([`${username+'_'+user_data.insertId}`, user_data.insertId])
        await createSubFolder('', `${username+'_'+user_data.insertId}`);
        return successResponse(res, "", 'User successfully registered');
    } catch (error) {
        next(error);
    }
};

const checkUserEmailVerification = async function(email){
    try {
        const [user] = await userDetailQuery([email]);
        if (!user.length) {
            return errorResponse(res, '', 'User not found');
        }
        const currentUser = user[0];
        let is_email_verified;
        if (currentUser.is_email_verified===0) {
            is_email_verified = false;
            return is_email_verified
        }else{
            is_email_verified = true
            return is_email_verified
        }
    } catch (error) {
        console.log("error", error);
        throw error
    }
}

export const userLogin = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        // let is_email_verified = true;
        const maxs_logins = process.env.MAX_LOGINS 
        const { email, password } = req.body;
        const [user] = await userDetailQuery([email]);
        if (!user.length) {
            return errorResponse(res, '', 'User not found');
        }
        const currentUser = user[0];

        let is_verified = await checkUserEmailVerification(email);
        if(is_verified===false){
            return unAuthorizedResponse(res, {is_email_verified:is_verified}, 'Please verify your email first before proceeding.');
        }
        if (currentUser.num_login>=maxs_logins) {
            return errorResponse(res, '', 'User can no longer login, the trial period has ended. Please contact support or get the subscription.');
        }

        let message = '';
        let token = '';
        if (email && password) {
            const isPasswordValid = await bcrypt.compare(password, currentUser.password);
            if (isPasswordValid) {
                message = 'You are successfully logged in';
            } else {
                return unAuthorizedResponse(res, '', 'Password is not correct. Please try again.');
            }
        } else {
            return errorResponse(res, '', 'Input fields are incorrect!');
        }
        token = jwt.sign({ id: currentUser._id, name: currentUser.first_name }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRATION_TIME,
        });
        await insertTokenQuery([token, currentUser._id]);
        return successResponse(res, { user_id: currentUser._id, user_name: currentUser.username , is_email_verified: is_verified, token: token , email:email}, message);
    } catch (error) {
        next(error);
    }
};

export const userLogout = async (req, res, next) => {
    try {
        const user_id = req.params.id;
        await insertTokenQuery(["", user_id]);
        return successResponse(res, '', `You have successfully logged out!`);
    } catch (error) {
        next(error);
    }
}

export const sendOtpForPasswordUpdate = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        const { email } = req.body;
        const otp = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit OTP
        const otpdata = await insertOtpQuery([otp, email])
        if (otpdata[0].changedRows === 0) {
            return errorResponse(res, '', 'Sorry, User not found. Please take a moment to register for an account.');
        } else {
            const data = await sendMail(email, `${otp} is the OTP for password update. Enter the Otp and then change password after the OTP is verified!\n\n\n\nRegards,\nAmarya Business Consultancy`, 'Password Change Verification');
            return successResponse(res, data, 'OTP for password update has been sent successfully.');
        }
    } catch (error) {
        next(error);
    }
}

export const resetPasswordValidation = async (req, res, next)=> {
    try{
        let { otp, email } = req.body;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        otp = parseInt(otp, 10);
        const [user_otp] = await getOtpQuery([email]);
        if (otp === user_otp[0].otp) {
            return successResponse(res, [{ email: email}], 'OTP verified successfully.');
        } else {
            return errorResponse(res, '', 'Invalid OTP');
        }
    } catch (error) {
        next(error);
    }
}

export const updateUserPassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        let {email, password, confirm_password, otp} = req.body;
        otp = parseInt(otp, 10);
        let [user_data] = await userDetailQuery([email]);
        if (user_data.length == 0) {
            return errorResponse(res, '', 'User not found');
        }
        if(otp ==user_data[0].otp){
            if (password === confirm_password) {
                const password_hash = await bcrypt.hash(password.toString(), 12);
                await updateUserPasswordQuery([password_hash, null,email]);
                return successResponse(res,"", 'User password updated successfully');
            } else {
                return errorResponse(res, '', 'Password and confirm password must be same, please try again.');
            }
        }else{
            return errorResponse(res, '', 'Invalid OTP');
        }
    } catch (error) {
        next(error);
    }
}

export const sendOtpForEmailVerification = async (req, res, next) => {
    try {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        const { email } = req.body;
        let [user_data] = await userDetailQuery([email]);
        if (user_data.length == 0) {
            return unAuthorizedResponse(res, '', 'User not found');
        }
        user_data = user_data[0];
        if(user_data.is_email_verified===1){
            return unAuthorizedResponse(res, '', 'Email already verified.');
        }
        const otp = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit OTP
        const otpdata = await insertOtpQuery([otp, email])
        if (otpdata[0].changedRows === 0) {
            return errorResponse(res, '', 'Sorry, user not found. Please take a moment to register for an account.');
        } else {
            const data = await sendMail(email, `${otp} is the OTP for email verification!\n\n\n\nRegards,\nAmarya Business Consultancy`, 'Email Verification');
            return successResponse(res, data, 'OTP for email verification has been sent successfully.');
        }
    } catch (error) {
        next(error);
    }
}
// export const sendOtpForLogin = async (req, res, next) => {
//     try {
//         const errors = validationResult(req);

//         if (!errors.isEmpty()) {
//             return errorResponse(res, errors.array(), "")
//         }
//         const { email } = req.body;
//         let is_verified = await checkUserEmailVerification(email);
//         if(is_verified===false){
//             return unAuthorizedResponse(res, {is_email_verified:is_verified}, 'Please verify your email first before proceeding.');
//         }else{
//             const otp = Math.floor(1000 + Math.random() * 9000);
//             const otpdata = await insertOtpQuery([otp, email])
//             if (otpdata[0].changedRows === 0) {
//                 return errorResponse(res, '', 'Sorry, user not found. Please take a moment to register for an account.');
//             } else {
//                 const data = await sendMail(email, `${otp} is the OTP for login!\n\n\n\nRegards,\nAmarya Business Consultancy`, 'Email Verification');
//                 return successResponse(res, data, 'OTP for login has been sent successfully.');
//             }
//         }
//     } catch (error) {
//         next(error);
//     }
// }

// export const verifyOtpForLogin = async (req, res, next) => {
//     try {
//         let { otp, email } = req.body;
//         email = email.toLowerCase();
//         const errors = validationResult(req);
//         let is_verified = await checkUserEmailVerification(email)
//         if(is_verified===false){
//             return unAuthorizedResponse(res, {is_email_verified:is_verified}, 'Please verify your email first before proceeding.');
//         }
//         if (!errors.isEmpty()) {
//             return errorResponse(res, errors.array(), "")
//         }
//         otp = parseInt(otp, 10);
//         const [user_otp] = await getOtpQuery([email]);
//         let message = '';
//         let token = '';
//         if (otp === user_otp[0].otp) {
//             message = 'You are successfully logged in';
//             const [user] = await userDetailQuery([email]);
//             const currentUser = user[0];
//             await setOtpNullQuery([email]);
//             token = jwt.sign({ id: currentUser.id, name: currentUser.first_name }, process.env.JWT_SECRET, {
//                 expiresIn: process.env.JWT_EXPIRATION_TIME,
//             });
//             await insertTokenQuery([token, currentUser.id]);
//             return successResponse(res, [{ user_id: currentUser.id, user_name: currentUser.username + " ", token: token }], message);
//         } else {
//             return errorResponse(res, '', 'Invalid OTP');
//         }
//     } catch (error) {
//         next(error);
//     }
// }

export const verifyEmail = async (req, res, next) => {
    try {
        let { otp, email } = req.body;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        otp = parseInt(otp, 10);
        const [user_otp] = await getOtpQuery([email]);
        if(user_otp.length==0){
            return unAuthorizedResponse(res, '', 'User not found');
        }
        if (otp === user_otp[0].otp) {
            await userEmailVerificationQuery([true, email]);
            return successResponse(res, '', 'OTP verified successfully.');
        } else {
            return unAuthorizedResponse(res, '', 'Invalid OTP');
        }
    } catch (error) {
        next(error);
    }
}

export const checkEmailVerification = async (req, res, next) => {
    try {
        const { email } = req.body;
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return errorResponse(res, errors.array(), "")
        }
        let [user_data] = await userDetailQuery([email]);
        if (user_data.length == 0) {
            return unAuthorizedResponse(res, '', 'User not found');
        }
        user_data = user_data[0];
        let is_email_verified= false;
        if(user_data.is_email_verified===1){
            is_email_verified =true;
        }

        return successResponse(res, { is_email_verified: is_email_verified }, 'Email verification status.');
    } catch (error) {
        next(error);
    }
}

// export const checkDoctorsFolderSize = async(doctor_id) => {
//     try {
//         // const errors = validationResult(req);

//         // if (!errors.isEmpty()) {
//         //     return errorResponse(res, errors.array(), "")
//         // }

//         // const {doctor_id} = req.query;
//         let data = await getPatientAndDoctorFolderNameQuery([doctor_id])
//         let total_doctors_folder_size = 0;

//         const getDoctorsFolderSize = async (folder_name) => {
//             try {
//                 const folder_data = await listFolderContents(folder_name);
//                 return folder_data.reduce((sum, file) => sum + file.Size, 0);
//             } catch (err) {
//                 console.error(`Error fetching folder size for ${folder_name}:`, err);
//                 return 0;
//             }
//         };

//         if (Array.isArray(data.patient_folder_name) && data.patient_folder_name.length) {
//             for (const patient_folder of data.patient_folder_name) {
//                 const folder_path = `${data.doctor_folder_name}/${patient_folder}`;
//                 console.log(folder_path);
//                 total_doctors_folder_size += await getDoctorsFolderSize(folder_path);
//             }
//         }

//         const fixed_folders = ["consent", "prosthesis"];
//         for (const folder of fixed_folders) {
//             const folder_path = `${data.doctor_folder_name}/${folder}`;
//             total_doctors_folder_size += await getDoctorsFolderSize(folder_path);
//         }
//         return successResponse(res, {total_doctors_folder_size}, '');
//     } catch (error) {
//         next(error);
//     }
// }
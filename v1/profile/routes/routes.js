import express, { Router } from 'express';
const app = express()
const router = Router();
import multer from 'multer';
import authenticateToken from '../../../middlewares/auth.js';
import {userLogin, userRegistration, updateUserPassword, userLogout, sendOtpForEmailVerification, verifyEmail, checkEmailVerification, 
    sendOtpForPasswordUpdate, resetPasswordValidation} from '../controllers/profileController.js';
import {allPatientsFolderName, deletePatientFile, getAllConsentAndProsthesisSignedUrl, getAllFilesSignedUrlByDoctor, getCommonConsentFormAndProthesis, savePatientData, uploadPatientFile} from '../controllers/patientController.js';
import {register, login, updatePassword, sendOtp, verifyOtp, patient} from '../../../utils/validation.js';
import { runModel } from '../controllers/modelController.js';
import { countFeatureLock } from '../controllers/featureCountController.js';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const upload_model = multer({ dest: 'images/' });
router.use(authenticateToken)

app.post('/login', login, userLogin);
app.post('/register', register, userRegistration);
app.post('/update-password', updatePassword, updateUserPassword);
app.post('/send-otp', sendOtp, sendOtpForEmailVerification)
app.post('/verify-email', verifyOtp, verifyEmail)
app.post('/count', countFeatureLock)
app.post('/check-email-verification', sendOtp, checkEmailVerification)
router.post('/save-patient', patient, savePatientData);
app.post('/send-otp-password-verification', sendOtp, sendOtpForPasswordUpdate);
app.post('/reset-password-otp-validation', verifyOtp, resetPasswordValidation);
router.post('/upload-patient-file', upload.single('file'), uploadPatientFile);
router.delete('/delete-patient-file', deletePatientFile);
router.get('/get-all-files-signed-url', getAllFilesSignedUrlByDoctor)
router.get('/get-consent-and-prosthesis-url', getAllConsentAndProsthesisSignedUrl)
router.get('/get-patient-folder-name', allPatientsFolderName)
// router.get('/upload-common-consent-and-prothesis', uploadCommonConsentFormAndProthesis)
router.get('/get-common-consent-and-prosthesis', getCommonConsentFormAndProthesis)
router.post('/efficient-sam', upload_model.single('image'), runModel);
// router.get('/check-doctor-folder-size', checkDoctorsFolderSize)
router.get('/logout/:id', userLogout);

app.use("/", router);

export default app;
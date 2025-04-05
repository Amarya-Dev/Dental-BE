import pool from "../../../config/db.js"

export const patientDetailQuery = (array) => {
    let query = `SELECT * FROM patients WHERE doctor_id = ? AND name = ? AND phone_number = ?`
    return pool.query(query, array);
}
export const getDoctorFolderName = (array) => {
    let query = `SELECT folder_name FROM doctors WHERE _id = ?`
    return pool.query(query, array);
}

export const patientDataSaveQuery = (array) => {
    let query = `INSERT INTO patients (
        doctor_id,
        name,
        phone_number,
        folder_name,
        age,
        gender, 
        created_at,
        updated_at
        ) VALUES (?,?,?,?,?,?,?,?);`
    return pool.query(query, array);
}

export const getS3FolderNameQuery = (array) => {
    const query = `
        SELECT CONCAT(d.folder_name, '/', p.folder_name) AS folder_name 
        FROM patients AS p
        LEFT JOIN doctors AS d ON d._id = p.doctor_id
        WHERE p._id = ? AND p.doctor_id = ?
    `;
    return pool.query(query, array);
};

export const insertFileKeyNameQuery = (array) =>{
    let query = `
    INSERT INTO aws_files (
    patient_id,
    doctor_id,
    key_name, 
    mime_type
    ) VALUES (?,?,?,?)`
    return pool.query(query, array);
}
export const insertDoctorFileKeyNameQuery = (array) =>{
    let query = `
    INSERT INTO doctor_files (
    doctor_id,
    key_name, 
    mime_type,
    type
    ) VALUES (?,?,?,?)`
    return pool.query(query, array);
}

export const allPatientsFolderNameQuery= async(array)=>{
    let query = `SELECT folder_name, _id as patient_id FROM patients WHERE doctor_id=?`;
    return pool.query(query, array);
}

export const getPatientAndDoctorFolderNameQuery = (array)=>{
    let query = `
    SELECT 
        d.folder_name AS doctor_folder_name, 
        GROUP_CONCAT(p.folder_name ORDER BY p.folder_name SEPARATOR ',') AS patient_folder_names
    FROM doctors AS d
    LEFT JOIN patients AS p ON d._id = p.doctor_id
    WHERE d._id = ?
    GROUP BY d.folder_name
    `;
    return pool.query(query, array).then(([rows]) => {
        if (rows.length > 0) {
            return {
                doctor_folder_name: rows[0].doctor_folder_name,
                patient_folder_name: rows[0].patient_folder_names ? rows[0].patient_folder_names.split(',') : []
            };
        }
        return null;
    });
}
export const getAllFilesSignedUrlQuery= async(array)=>{
    let query = `SELECT _id AS file_id, mime_type, key_name FROM aws_files WHERE doctor_id=? AND patient_id=?`;
    return pool.query(query, array);
}

export const getConsentAndProsthesisSignedUrlQuery= async(array)=>{
    let query = `SELECT _id AS file_id, key_name, mime_type FROM doctor_files WHERE doctor_id=? AND type=?`;
    return pool.query(query, array);
}

export const deleteFilesQuery = (patientId, doctorId, keyNames) => {
    let placeholders = keyNames.map(() => '?').join(',');
    let query = `DELETE FROM aws_files WHERE patient_id=? AND doctor_id=? AND key_name IN (${placeholders})`;
    
    return pool.query(query, [patientId, doctorId, ...keyNames]);
};

export const deleteFilesFromDoctorQuery = (doctorId, keyNames) => {
    if (!keyNames || keyNames.length === 0) {
        // Nothing to delete
        return Promise.resolve([[], []]);
    }
    let placeholders = keyNames.map(() => '?').join(',');
    let query = `DELETE FROM doctor_files WHERE doctor_id=? AND key_name IN (${placeholders})`;
    
    return pool.query(query, [doctorId, ...keyNames]);
};

export const getKeyNamesByFileIds = (file_id) => {
    let placeholders = file_id.map(() => '?').join(','); // Create placeholders for the file_ids array
    let query = `SELECT key_name FROM aws_files WHERE _id IN (${placeholders})`;
    
    return pool.query(query, file_id);
};

export const getKeyNamesByFileIdsForDoctor = (file_id) => {
    let placeholders = file_id.map(() => '?').join(','); // Create placeholders for the file_ids array
    let query = `SELECT key_name FROM doctor_files WHERE _id IN (${placeholders})`;
    
    return pool.query(query, file_id);
};
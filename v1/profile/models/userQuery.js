import pool from "../../../config/db.js"

export const userDetailQuery = (array) => {
    let query = `SELECT * FROM doctors WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const userRegistrationQuery = async (array) => {
    let query = `INSERT INTO doctors (
        username,
        email,
        is_registered,
        password,
        created_at,
        updated_at
        ) VALUES (?,?,?,?,?,?);`
    return await pool.query(query, array);
}

export const insertTokenQuery = (array) => {
    let query = `UPDATE doctors SET auth_token = ? WHERE _id = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const updateUserPasswordQuery = (array) => {
    let query = `UPDATE doctors SET password = ?, otp = ? WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const insertOtpQuery = (array) => {
    let query = `UPDATE doctors SET otp = ? WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const getOtpQuery = (array) => {
    let query = `SELECT otp FROM doctors WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const userEmailVerificationQuery = (array) => {
    let query = `UPDATE doctors SET is_email_verified = ?, otp = null WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}
export const setOtpNullQuery = (array) => {
    let query = `UPDATE doctors SET otp = null WHERE email = ? AND is_registered = 1 AND is_email_verified = true`
    return pool.query(query, array);
}

export const insertResetPasswordTokenQuery = (array) => {
    let query = `UPDATE doctors SET token = ? WHERE email = ? AND is_registered = 1`
    return pool.query(query, array);
}

export const getTokenQuery = (array) => {
    let query = `SELECT COUNT(*) AS value_exists
    FROM doctors
    WHERE token = ?;`
    return pool.query(query, array);
}

export const fetchEmail = (array) => {
    let query = `SELECT email FROM doctors WHERE token = ? AND is_registered = 1`
    return pool.query(query, array);
}

// export const userSystemCheckQuery = (array) => {
//     let query = `SELECT * FROM profile WHERE system_number = ? AND is_registered = 1`
//     return pool.query(query, array);
// }

export const insertFolderNameQuery = async (array) => {
    let query = `UPDATE doctors SET folder_name = ? WHERE _id = ?`
    await pool.query(query, array);
}
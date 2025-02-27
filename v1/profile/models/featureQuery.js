import pool from "../../../config/db.js"

export const insertFeatureCountQuery = (array) => {
    if (!Array.isArray(array) || array.length !== 13) {
        throw new Error("Invalid input: Expected an array with 13 elements.");
    }

    let query = `INSERT INTO features (
            doctor_id,
            line,
            square,
            \`text\`,
            pencil,
            pen,
            \`marker\`,
            brush,
            filling,
            \`point\`,
            \`box\`,
            prosthesis,
            audio 
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?);`;

    return pool.query(query, array);
};

export const getFeatureCountForDoctorQuery = (array) => {
    let query = ` SELECT * from features WHERE doctor_id = ?`
    return pool.query(query, array);
}

export const updateFeatureCountQuery = (array) => {
    let query = `UPDATE features SET 
                line = line + ?, 
                square = square + ?, 
                text = text + ?, 
                pencil = pencil + ?, 
                pen = pen + ?, 
                marker = marker + ?, 
                brush = brush + ?, 
                filling = filling + ?, 
                point = point + ?, 
                box = box + ?, 
                prosthesis = prosthesis + ?, 
                audio = audio + ? 
                WHERE doctor_id = ?`
    return pool.query(query, array);
}
const doctorKeyTable = `
CREATE TABLE IF NOT EXISTS doctor_files (
    _id INT NOT NULL AUTO_INCREMENT,
    doctor_id INT NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    type VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(_id) ON DELETE CASCADE,
    INDEX idx_doctor_id (doctor_id)
) AUTO_INCREMENT = 1111;
`;

export default doctorKeyTable;
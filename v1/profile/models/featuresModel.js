const featuresTable = `
CREATE TABLE IF NOT EXISTS features (
    _id INT NOT NULL AUTO_INCREMENT,
    doctor_id INT NOT NULL,
    line INT DEFAULT 0,
    square INT DEFAULT 0 ,
    text INT DEFAULT 0,
    pencil INT DEFAULT 0,
    pen INT DEFAULT 0,
    marker INT DEFAULT 0,
    brush INT DEFAULT 0,
    filling INT DEFAULT 0,
    point INT DEFAULT 0,
    box INT DEFAULT 0,
    prosthesis INT DEFAULT 0,
    audio INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(_id) ON DELETE CASCADE,
    INDEX idx_doctor_id (doctor_id)
) AUTO_INCREMENT = 1111;
`;

export default featuresTable;
const timeCountfeaturesTable = `
CREATE TABLE IF NOT EXISTS time_count_features (
    _id INT NOT NULL AUTO_INCREMENT,
    doctor_id INT NOT NULL,
    time_in_secs INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(_id) ON DELETE CASCADE,
    INDEX idx_doctor_id (doctor_id)
) AUTO_INCREMENT = 1111;
`;

export default timeCountfeaturesTable;
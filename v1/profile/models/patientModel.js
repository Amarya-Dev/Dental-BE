const patientTable = `
CREATE TABLE IF NOT EXISTS patients (
    _id int NOT NULL AUTO_INCREMENT,
    doctor_id int NOT NULL,
    name varchar(255) NOT NULL,
    phone_number varchar(10) NOT NULL,
    folder_name varchar(255) NOT NULL,
    age int(4) DEFAULT NULL,
    gender varchar(25) DEFAULT NULL,
    created_at datetime NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(_id)
) AUTO_INCREMENT = 1111`;

export default patientTable;

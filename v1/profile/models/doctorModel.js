const doctorTable = `
CREATE TABLE IF NOT EXISTS doctors (
    _id int NOT NULL AUTO_INCREMENT,
    username varchar(255) NOT NULL,
    email varchar(255) NOT NULL,
    password varchar(255) NOT NULL,
    folder_name varchar(255),
    otp int DEFAULT NULL,
    is_registered tinyint(1) NOT NULL,
    is_email_verified boolean DEFAULT false,
    auth_token varchar(255) DEFAULT NULL,
    token varchar(255) DEFAULT NULL,
    num_login INT DEFAULT 0,
    created_at datetime NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (_id),
    UNIQUE KEY email (email)
) AUTO_INCREMENT = 1111`;

export default doctorTable;

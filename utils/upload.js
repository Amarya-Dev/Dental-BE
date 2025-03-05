import AWS from 'aws-sdk';

const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY
const ACCESS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY
const REGION = process.env.AWS_REGION
const BUCKET_NAME = process.env.DOCTORS_BUCKET
AWS.config.update({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: ACCESS_SECRET_KEY,
  region: REGION
});

export const s3 = new AWS.S3();

export const createFolder = async (folder_name) => {
  if (!folder_name.endsWith('/')) {
    folder_name += '/';
  }

  const params = {
    Bucket: BUCKET_NAME,
    Key: folder_name,
    Body: ''
  };

  try {
    await s3.putObject(params).promise();
    console.log("Folder created successfully");
  } catch (error) {
    console.error(`❌ Error creating folder: ${error.message}`);
  }
};

export const createDefaultFolder = async() => {
  try {
    let DEFAULT_FOLDERS=['consent','prosthesis']
    console.log(DEFAULT_FOLDERS);
    const folder_promises = DEFAULT_FOLDERS.map(folder => createFolder(folder));
    await Promise.all(folder_promises);
  } catch (error) {
    console.error(`❌ Error creating folder: ${error.message}`);
  }
}

export const createSubFolder = async(folder_name, doctor_folder_name) =>{
  try {
    if(folder_name){
      await createFolder(`${folder_name}`);
    }
    if(doctor_folder_name){
      await Promise.all([createFolder(`${doctor_folder_name}/consent`), createFolder(`${doctor_folder_name}/prosthesis`), createFolder(`${doctor_folder_name}/patients`)])
    }
  } catch (error) {
    console.error(`❌ Error creating folder: ${error.message}`);
  }
}

export const uploadObject = async (file_name, buffer, folder_name) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: `${folder_name}/${file_name}`,
      Body: buffer
      // ACL: 'public-read', // Optional: Change access permissions
      // ContentType: 'image/jpeg' // Optional: Set MIME type
    };
    const response = await s3.upload(params).promise();
    // console.log(`✅ File uploaded successfully! Response: ${response}`);
    return response;
  } catch (error) {
    console.error(`❌ Error uploading file: ${error.message}`);
  }
}

export const generatePresignedUrl = async (file_key, mime_type) => {
  try {

    // Check if it's a valid image type
    // if (!mime_type.startsWith('image/')) {
    //   throw new Error('Invalid file type. Only images are allowed.');
    // }
    const params = {
      Bucket: BUCKET_NAME,
      Key: file_key,
      Expires: 3600,
      ResponseContentType: mime_type 
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error(`❌ Error generating pre-signed URL: ${error.message}`);
  }
};

export const listFolderContents = async (folder_name) => {
  if (!folder_name.endsWith('/')) {
    folder_name += '/';
  }
  const params = {
    Bucket: BUCKET_NAME,
    Prefix: folder_name,
    Delimiter: '/' // Optional: helps if you want to see subfolders separately
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    return data.Contents
  } catch (error) {
    console.error(`Error listing folder contents: ${error.message}`);
  }
};

export const deleteMultipleObjects = async (file_keys) => {
  try {
    let  obj_array = file_keys.map((key) => ({ Key: key }))
    console.log(obj_array)
    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: file_keys.map((key) => ({ Key: key })),
        Quiet: false
      }
    };
    const response = await s3.deleteObjects(params).promise();
    console.log(`✅ Files deleted successfully from bucket "${BUCKET_NAME}"`, response);
    return response;
  } catch (error) {
    console.error(`❌ Error deleting files: ${error.message}`);
  }
};

export const createS3Bucket = async () => {
  try {

    const existing_buckets = await s3.listBuckets().promise();
    const bucket_exists = existing_buckets.Buckets.some(bucket => bucket.Name === BUCKET_NAME);

    if (bucket_exists) {
      console.log(`Bucket "${BUCKET_NAME}" already exists.`);
      return;
    }

    // Create Bucket if not exists
    await s3.createBucket({ Bucket: BUCKET_NAME }).promise();
    console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
  } catch (error) {
    console.error("Error creating S3 bucket:", error);
  }
};
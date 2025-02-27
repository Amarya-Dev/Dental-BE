import dotenv from "dotenv";
import { promises as fs } from "fs";
import path from 'path';
dotenv.config();


export const deletingFilesFromImages = async () => {
  try {
    const files = await fs.readdir('images');
        for (const file of files) {
            const filePath = path.join('images', file);
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                await fs.unlink(filePath);
                console.log(`Deleted: ${filePath}`);
            }
        }
        console.log('All files deleted successfully.');
  } catch (error) {
    console.error('Error deleting files:', error);
  }
};

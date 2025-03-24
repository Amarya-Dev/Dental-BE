
import cron from "node-cron";
import { deletingFilesFromImages } from '../cron_jobs/cronFunctions.js';

export const runCronJobs = async () => {

    cron.schedule('	0 0 * * *', async () => {
        try {
            await deletingFilesFromImages()
        } catch (error) {
            console.error('Error executing cron deletingFilesFromImages:', error);
        }
    });
}
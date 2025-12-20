
import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const bucketName = process.env.B2_BUCKET;

const run = async () => {
    if (!bucketName) {
        console.error("Error: B2_BUCKET is not defined in .env");
        return;
    }

    if (!process.env.B2_KEY_ID || !process.env.B2_APPLICATION_KEY) {
        console.error("Error: B2 credentials are missing in .env");
        return;
    }

    if (process.env.B2_KEY_ID.length < 20) {
        console.error("Error: Your B2_KEY_ID is too short (" + process.env.B2_KEY_ID.length + " chars). It must be an Application Key (~25 chars), not the Master Key.");
        console.error("Please create a new App Key in Backblaze Console and update .env");
        return;
    }

    const client = new S3Client({
        region: process.env.B2_REGION || "us-east-005",
        endpoint: `https://${process.env.B2_ENDPOINT}`,
        credentials: {
            accessKeyId: process.env.B2_KEY_ID,
            secretAccessKey: process.env.B2_APPLICATION_KEY,
        },
        forcePathStyle: false,
    });

    console.log(`Setting CORS policy for bucket: ${bucketName}...`);

    const corsParams = {
        Bucket: bucketName,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "PUT", "POST", "HEAD", "DELETE"],
                    AllowedOrigins: ["*"],
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000,
                },
            ],
        },
    };

    try {
        const data = await client.send(new PutBucketCorsCommand(corsParams));
        console.log("Success! CORS policy updated.", data);
    } catch (err) {
        console.error("Error setting CORS policy:", err);
    }
};

run();

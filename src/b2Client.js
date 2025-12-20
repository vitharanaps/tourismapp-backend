// src/b2Client.js
import { S3Client } from "@aws-sdk/client-s3";


export const b2Client = new S3Client({
  region: "auto", // Backblaze uses 'auto'
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
  forcePathStyle: false, // Backblaze S3-compatible
});

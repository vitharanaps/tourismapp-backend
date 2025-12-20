// routes/uploads.js
import express from "express";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { b2Client } from "../b2Client.js"

const router = express.Router();

router.post("/b2-presign", async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res
        .status(400)
        .json({ message: "fileName and contentType are required" });
    }

    const bucket = process.env.B2_BUCKET;

    const ext = fileName.split(".").pop();
    const key = `listings/${crypto.randomUUID()}.${ext || "jpg"}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      //  ACL: "public-read", // or remove if bucket is private
    });

    const presignedUrl = await getSignedUrl(b2Client, command, {
      expiresIn: 600, // 10 minutes
    });

    const publicFileUrl = `https://${process.env.B2_ENDPOINT}/${bucket}/${key}`;

    return res.json({ presignedUrl, publicFileUrl });
  } catch (err) {
    console.error("b2-presign error", err);
    return res.status(500).json({ message: "Failed to create upload URL" });
  }
});

export default router;

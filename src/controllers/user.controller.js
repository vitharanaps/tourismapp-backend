// src/controllers/user.controller.js
import * as UserModel from "../models/user.model.js";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Client } from "../b2Client.js";
import crypto from "crypto";

export async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        let avatarUrl = null;

        if (req.file) {
            const ext = req.file.originalname.split(".").pop();
            const key = `avatars/${crypto.randomUUID()}.${ext || "jpg"}`;

            await b2Client.send(new PutObjectCommand({
                Bucket: process.env.B2_BUCKET,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            }));

            avatarUrl = `https://${process.env.B2_BUCKET}.${process.env.B2_ENDPOINT}/${key}`;
        }

        const updateData = {
            ...req.body,
        };

        if (avatarUrl) {
            updateData.avatar_url = avatarUrl;
        }

        const updatedUser = await UserModel.updateUser(userId, updateData);
        return res.json({ user: updatedUser });
    } catch (err) {
        console.error("Update profile error:", err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
}

export async function getWishlist(req, res) {
    try {
        const userId = req.user.id;
        const wishlist = await UserModel.getWishlist(userId);
        return res.json(wishlist);
    } catch (err) {
        console.error("Get wishlist error:", err);
        return res.status(500).json({ message: "Failed to retrieve wishlist" });
    }
}

export async function toggleWishlist(req, res) {
    try {
        const userId = req.user.id;
        const { listingId, action } = req.body; // action: 'add' or 'remove'

        if (action === "add") {
            await UserModel.addToWishlist(userId, listingId);
        } else if (action === "remove") {
            await UserModel.removeFromWishlist(userId, listingId);
        } else {
            return res.status(400).json({ message: "Invalid action" });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("Toggle wishlist error:", err);
        return res.status(500).json({ message: "Failed to update wishlist" });
    }
}

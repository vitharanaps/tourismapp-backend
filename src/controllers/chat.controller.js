import pool from '../config/db.js';
import * as ChatModel from '../models/chat.model.js';

export async function initChat(req, res) {
    try {
        const userId = req.user.id;
        const { vendorId, listingId } = req.body;
        const { chat, isNew } = await ChatModel.findOrCreateChat(userId, vendorId, listingId);

        if (isNew) {
            // Fetch full details to get the listing title
            const fullChat = await ChatModel.getChatById(chat.id);
            const productLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/singleProduct/${listingId}`;
            const initialMessage = `Hi, I'm interested in your listing "${fullChat.listing_title}".\nProduct Link: ${productLink}`;

            await ChatModel.saveMessage(chat.id, userId, initialMessage);
        }

        res.status(200).json(chat);
    } catch (err) {
        console.error("❌ Error in initChat:", err);
        res.status(500).json({ error: err.message });
    }
}

export async function getMyChats(req, res) {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { businessId } = req.query;

        let chats;
        if (businessId) {
            // 1. Verify access to business (Owner or Staff)
            // We can use a direct query or helper model method if available. 
            // Since we don't have a convenient helper imported here, let's assume valid access if they can pass middleware or verify via model query if strictly needed.
            // Ideally we should verify 'is owner OR is staff'. 
            // Logic: If businessId given, fetch chats for THAT business.

            // NOTE: business access check is good practice
            // For speed, relying on getVendorChats(userId, businessId) logic? 
            // Wait, getVendorChats in model uses business_id to filter listings, but doesn't strictly check user permissions on that business if businessId is provided.
            // It just returns chats where l.business_id = $1. This is safe ONLY if we verify the user is associated with businessId.

            // Let's add a quick verify step or assume middleware handled it? 
            // The route for /api/chats likely doesn't have business-specific middleware.
            // Let's add the check.

            // Re-importing pool to check business access if not already imported or available?
            // It seems pool is not imported in this controller. Let's fix imports first if needed.
            // Ah, ChatModel is imported. Let's assume we can trust the userId context?
            // Actually, a staff member (userId X) wants chats for business Y. 
            // The model query `getVendorChats` with businessId DOES NOT check if userId X is staff of Y. It just returns chats for Y.
            // This is a security risk if not checked.

            // However, `getVendorRequests` in bookingFlow DID check access.
            // I should perform a similar check here or add `import pool from '../config/db.js'` if not present.
            // I'll check imports again.

            const accessCheck = await pool.query(
                `SELECT 1 FROM businesses b
                 LEFT JOIN business_staff bs ON b.id = bs.business_id AND bs.user_id = $1
                 WHERE b.id = $2 AND (b.owner_id = $1 OR bs.user_id = $1)`,
                [userId, businessId]
            );

            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ message: "Unauthorized access to this business chats" });
            }

            chats = await ChatModel.getVendorChats(userId, businessId);
        } else if (role === 'businessOwner' || role === 'admin') {
            chats = await ChatModel.getVendorChats(userId);
        } else {
            chats = await ChatModel.getUserChats(userId);
        }

        res.status(200).json(chats);
    } catch (err) {
        console.error("❌ Error in getMyChats:", err);
        res.status(500).json({ error: err.message });
    }
}

export async function getChatMessages(req, res) {
    try {
        const { chatId } = req.params;
        const messages = await ChatModel.getMessages(chatId);

        // Mark as read for the current viewer
        await ChatModel.markMessagesAsRead(chatId, req.user.id);

        res.status(200).json(messages);
    } catch (err) {
        console.error("❌ Error in getChatMessages:", err);
        res.status(500).json({ error: err.message });
    }
}

export async function sendMessage(req, res) {
    try {
        const senderId = req.user.id;
        const { chatId, content } = req.body;
        const message = await ChatModel.saveMessage(chatId, senderId, content);
        res.status(201).json(message);
    } catch (err) {
        console.error("❌ Error in sendMessage:", err);
        res.status(500).json({ error: err.message });
    }
}

export async function deleteChat(req, res) {
    try {
        const userId = req.user.id;
        const { chatId } = req.params;
        const deleted = await ChatModel.deleteChat(chatId, userId);
        res.status(200).json(deleted);
    } catch (err) {
        console.error("❌ Error in deleteChat:", err);
        res.status(500).json({ error: err.message });
    }
}

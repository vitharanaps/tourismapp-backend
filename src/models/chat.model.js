import pool from '../config/db.js';

export async function findOrCreateChat(userId, vendorId, listingId) {
    // Check for existing chat
    const existing = await pool.query(
        'SELECT * FROM chats WHERE user_id = $1 AND vendor_id = $2 AND listing_id = $3',
        [userId, vendorId, listingId]
    );

    if (existing.rows[0]) {
        return { chat: existing.rows[0], isNew: false };
    }

    // Create new chat
    const result = await pool.query(
        'INSERT INTO chats (user_id, vendor_id, listing_id) VALUES ($1, $2, $3) RETURNING *',
        [userId, vendorId, listingId]
    );
    return { chat: result.rows[0], isNew: true };
}

export async function getChatById(chatId) {
    const query = `
        SELECT c.*, 
               u1.name as user_name, u1.avatar_url as user_image,
               u2.name as vendor_name, u2.avatar_url as vendor_image,
               l.title as listing_title, l.business_id
        FROM chats c
        JOIN users u1 ON c.user_id = u1.id
        JOIN users u2 ON c.vendor_id = u2.id
        JOIN listings l ON c.listing_id = l.id
        WHERE c.id = $1
    `;
    const result = await pool.query(query, [chatId]);
    return result.rows[0];
}

export async function getBusinessStaffIds(businessId) {
    const result = await pool.query(
        'SELECT user_id FROM business_staff WHERE business_id = $1',
        [businessId]
    );
    return result.rows.map(row => row.user_id);
}

export async function getUserChats(userId) {
    const query = `
        SELECT c.*, 
               u.name as vendor_name, u.avatar_url as vendor_image,
               l.title as listing_title, l.images as listing_images,
               (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.sender_id != $1 AND m.is_read = FALSE)::int as unread_count
        FROM chats c
        JOIN users u ON c.vendor_id = u.id
        JOIN listings l ON c.listing_id = l.id
        WHERE c.user_id = $1
        ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
}

export async function getVendorChats(vendorId, businessId = null) {
    let query = `
        SELECT c.*, 
               u.name as user_name, u.avatar_url as user_image,
               l.title as listing_title, l.images as listing_images,
               (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.sender_id != $1 AND m.is_read = FALSE)::int as unread_count
        FROM chats c
        JOIN users u ON c.user_id = u.id
        JOIN listings l ON c.listing_id = l.id
        WHERE c.vendor_id = $1
    `;
    const params = [vendorId];

    if (businessId) {
        query = `
            SELECT c.*, 
                   u.name as user_name, u.avatar_url as user_image,
                   l.title as listing_title, l.images as listing_images,
                   (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id AND m.sender_id != $1 AND m.is_read = FALSE)::int as unread_count
            FROM chats c
            JOIN users u ON c.user_id = u.id
            JOIN listings l ON c.listing_id = l.id
            WHERE l.business_id = $2
        `;
        // Careful with params mapping: $1 is vendorId (not used in query 2 directly if we filter by businessId only? 
        // Actually getVendorChats usually filters by vendor_id OR business_id.
        // The original logic replaced the whole query.
        // Let's stick to the convention. 
        // Logic: unread count is relative to the VIEWER.
        // If businessId is provided, the viewer is likely a staff member or owner.
        // But getVendorChats is called with (userId, businessId).
        // Params[0] is userId (the viewer).

        // Wait, original call: chats = await ChatModel.getVendorChats(userId, businessId);
        // So param 1 is userId (viewer).

        params[0] = vendorId; // This is the viewer ID
        params.push(businessId); // This is $2
    }

    query += " ORDER BY c.created_at DESC";
    const result = await pool.query(query, params);
    return result.rows;
}

export async function saveMessage(chatId, senderId, content) {
    const result = await pool.query(
        `WITH inserted AS (
           INSERT INTO messages (chat_id, sender_id, content) 
           VALUES ($1, $2, $3) 
           RETURNING *
         )
         SELECT i.*, u.name as sender_name, u.avatar_url as sender_image
         FROM inserted i
         JOIN users u ON i.sender_id = u.id`,
        [chatId, senderId, content]
    );
    return result.rows[0];
}

export async function getMessages(chatId) {
    const result = await pool.query(
        'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC',
        [chatId]
    );
    return result.rows;
}

export async function markMessagesAsRead(chatId, userId) {
    // Mark messages as read where I am the receiver (sender != me)
    await pool.query(
        'UPDATE messages SET is_read = TRUE WHERE chat_id = $1 AND sender_id != $2 AND is_read = FALSE',
        [chatId, userId]
    );
}

export async function getUnreadCount(userId) {
    const result = await pool.query(
        `SELECT COUNT(*) as count 
         FROM messages m
         JOIN chats c ON m.chat_id = c.id
         WHERE (c.user_id = $1 OR c.vendor_id = $1) 
         AND m.sender_id != $1 
         AND m.is_read = FALSE`,
        [userId]
    );
    return parseInt(result.rows[0].count, 10);
}

export async function deleteChat(chatId, userId) {
    // Check if the user belongs to the chat first (security)
    const chat = await pool.query(
        'SELECT * FROM chats WHERE id = $1 AND (user_id = $2 OR vendor_id = $2)',
        [chatId, userId]
    );

    if (chat.rows.length === 0) {
        throw new Error('Chat not found or unauthorized');
    }

    // Delete messages first (due to foreign key)
    await pool.query('DELETE FROM messages WHERE chat_id = $1', [chatId]);

    // Delete the chat record
    const result = await pool.query(
        'DELETE FROM chats WHERE id = $1 RETURNING *',
        [chatId]
    );
    return result.rows[0];
}

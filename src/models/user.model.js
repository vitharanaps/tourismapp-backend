// src/models/user.model.js
import pool from "../config/db.js";

export async function updateUser(userId, data) {
  const { name, phone, address, city, country, avatar_url } = data;
  const result = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         phone = COALESCE($3, phone),
         address = COALESCE($4, address),
         city = COALESCE($5, city),
         country = COALESCE($6, country),
         avatar_url = COALESCE($7, avatar_url)
     WHERE id = $1
     RETURNING *`,
    [userId, name, phone, address, city, country, avatar_url]
  );
  return result.rows[0];
}

export async function getWishlist(userId) {
  const result = await pool.query(
    `SELECT l.* 
     FROM wishlists w
     JOIN listings l ON w.listing_id = l.id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function addToWishlist(userId, listingId) {
  await pool.query(
    `INSERT INTO wishlists (user_id, listing_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, listingId]
  );
}

export async function removeFromWishlist(userId, listingId) {
  await pool.query(
    `DELETE FROM wishlists WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId]
  );
}

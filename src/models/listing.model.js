// src/models/listing.model.js
import pool from "../config/db.js";



export async function createListing(vendorId, data) {
  const {
    title,
    description,
    type,
    price,
    currency,
    images,
    address,
    city,
    country,
    lat,
    lng,
    amenities,
  } = data;

  const result = await pool.query(
    `INSERT INTO listings
     (vendor_id, title, description, type, price, currency, images,
      address, city, country, lat, lng, amenities)
     VALUES
     ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      vendorId,
      title,
      description,
      type,
      price,
      currency,
      images,
      address,
      city,
      country,
      lat,
      lng,
      amenities,
    ]
  );

  return result.rows[0];
}

export async function getListingsByVendor(vendorId) {
  const result = await pool.query(
    "SELECT * FROM listings WHERE vendor_id = $1 ORDER BY created_at DESC",
    [vendorId]
  );
  return result.rows;
}

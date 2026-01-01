// models/bookingFlow.model.js
import pool from '../config/db.js';

export async function createUserRequest(requestData) {
  const query = `
    INSERT INTO user_requests (listing_id, business_type, user_id, vendor_id, requested_start, requested_end, quantity, duration, user_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const result = await pool.query(query, [
    requestData.listing_id, requestData.business_type, requestData.user_id,
    requestData.vendor_id, requestData.requested_start, requestData.requested_end,
    requestData.quantity, requestData.duration, requestData.user_message
  ]);

  return result.rows[0];
}

export async function createVendorOffer(offerData) {
  const query = `
    INSERT INTO vendor_offers (request_id, vendor_id, offered_start, offered_end, offered_quantity, offered_price, offer_message)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

  const result = await pool.query(query, [
    offerData.request_id, offerData.vendor_id, offerData.offered_start,
    offerData.offered_end, offerData.offered_quantity, offerData.offered_price,
    offerData.offer_message
  ]);

  // Update request status
  await pool.query(
    'UPDATE user_requests SET status = $1 WHERE id = $2',
    ['responded', offerData.request_id]
  );

  return result.rows[0];
}

export async function acceptOffer(offerId, userId, paymentMethod) {
  const offerQuery = `
    SELECT vo.*, ur.listing_id, ur.user_id, ur.vendor_id, l.type as business_type, l.currency
    FROM vendor_offers vo
    JOIN user_requests ur ON vo.request_id = ur.id
    JOIN listings l ON ur.listing_id = l.id
    WHERE vo.id = $1
  `;

  const offerResult = await pool.query(offerQuery, [offerId]);
  const offer = offerResult.rows[0];

  if (!offer || offer.user_id !== userId) {
    throw new Error('Unauthorized or Offer not found');
  }

  // Create booking
  const bookingQuery = `
    INSERT INTO bookings (offer_id, request_id, listing_id, user_id, vendor_id, business_type, start_date, end_date, quantity, total_price, payment_method, payment_status, currency)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  try {
    const bookingResult = await pool.query(bookingQuery, [
      offerId, offer.request_id, offer.listing_id, userId, offer.vendor_id,
      offer.business_type, offer.offered_start, offer.offered_end,
      offer.offered_quantity, offer.offered_price, paymentMethod,
      paymentMethod === 'card' ? 'paid' : 'unpaid',
      offer.currency
    ]);

    // Update statuses
    await pool.query('UPDATE vendor_offers SET status = $1 WHERE id = $2', ['accepted', offerId]);
    await pool.query('UPDATE user_requests SET status = $1 WHERE id = $2', ['accepted', offer.request_id]);

    return bookingResult.rows[0];
  } catch (err) {
    console.error("❌ SQL Error in acceptOffer:", err);
    throw err;
  }
}

export async function getUserRequestStatus(userId, listingId) {
  const query = `
    SELECT ur.*, vo.*,
           l.title, l.business_type, l.price
    FROM user_requests ur
    LEFT JOIN vendor_offers vo ON ur.id = vo.request_id
    JOIN listings l ON ur.listing_id = l.id
    WHERE ur.user_id = $1 AND ur.listing_id = $2
    ORDER BY ur.created_at DESC LIMIT 1
  `;
  const result = await pool.query(query, [userId, listingId]);
  return result.rows[0];
}

export async function getVendorRequests(vendorId, businessId = null) {
  let query = `
    SELECT ur.*, 
           vo.id as offer_id, vo.offered_price, vo.status as offer_status,
           u.name as user_name, u.phone,
           l.title, l.price
    FROM user_requests ur
    LEFT JOIN vendor_offers vo ON ur.id = vo.request_id
    JOIN users u ON ur.user_id = u.id
    JOIN listings l ON ur.listing_id = l.id
    WHERE ur.vendor_id = $1
  `;
  const params = [vendorId];

  if (businessId) {
    query = `
      SELECT ur.*, 
             vo.id as offer_id, vo.offered_price, vo.status as offer_status,
             u.name as user_name, u.phone,
             l.title, l.price
      FROM user_requests ur
      LEFT JOIN vendor_offers vo ON ur.id = vo.request_id
      JOIN users u ON ur.user_id = u.id
      JOIN listings l ON ur.listing_id = l.id
      WHERE l.business_id = $1
    `;
    params[0] = businessId;
  }

  query += " ORDER BY ur.created_at DESC";
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getUserRequests(userId) {
  const query = `
    SELECT ur.*, 
           vo.id as offer_id, vo.offered_price, vo.offer_message, vo.status as offer_status,
           l.title, l.images, l.type as business_type, l.price as original_price
    FROM user_requests ur
    LEFT JOIN vendor_offers vo ON ur.id = vo.request_id
    JOIN listings l ON ur.listing_id = l.id
    WHERE ur.user_id = $1
    ORDER BY ur.created_at DESC
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

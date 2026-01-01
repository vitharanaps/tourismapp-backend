// src/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from './db.js';

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const name = profile.displayName;
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : null;
        const avatarUrl =
          profile.photos && profile.photos.length > 0
            ? profile.photos[0].value
            : null;

        // Check if user exists
        const existing = await pool.query(
          'SELECT * FROM users WHERE google_id = $1',
          [googleId]
        );

        let user;
        if (existing.rows.length > 0) {
          user = existing.rows[0];

          // Check if user is blocked
          if (user.is_blocked) {
            return done(null, false, { message: 'Your account has been blocked. Please contact support.' });
          }
        } else {
          // Create new user
          const insert = await pool.query(
            `INSERT INTO users (google_id, name, email, avatar_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [googleId, name, email, avatarUrl]
          );
          user = insert.rows[0];
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Store only user.id in the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Load full user from DB for each request
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0] || null;
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;

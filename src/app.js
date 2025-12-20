import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import 'dotenv/config';

import './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import vendorRouter from "./routes/vendor.routes.js";
import uploadsRouter from "./routes/uploads.js"
import listingRouter from "./routes/listing.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";


const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax', // 'lax' allows cookies on same-site navigation
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/uploads", uploadsRouter);
app.use('/auth', authRoutes);
app.use("/api/vendor", vendorRouter);
app.use("/api/listings", listingRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);

app.get('/', (req, res) => {
  res.send('TourismHub backend running (ESM)');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

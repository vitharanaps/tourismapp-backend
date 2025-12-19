import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import 'dotenv/config';

import './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import vendorRouter from "./routes/vendor.routes.js";
import uploadsRouter  from "./routes/uploads"
app.use("/api/uploads", uploadsRouter);
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', authRoutes);
app.use("/api/vendor", vendorRouter);

app.get('/', (req, res) => {
  res.send('TourismHub backend running (ESM)');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

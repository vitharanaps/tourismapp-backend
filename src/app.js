import express from 'express';
import session from 'express-session';
import cors from 'cors';
import passport from 'passport';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';

import './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import vendorRouter from "./routes/vendor.routes.js";
import uploadsRouter from "./routes/uploads.js"
import listingRouter from "./routes/listing.routes.js";
import businessRouter from "./routes/business.routes.js";
import bookingRouter from "./routes/booking.routes.js";
import userRouter from "./routes/user.routes.js";
import adminRouter from "./routes/admin.routes.js";
import bookingFlowRouter from './routes/bookingFlow.js';
import reviewRouter from './routes/review.routes.js';
import chatRouter from './routes/chat.js';
import categoryRouter from './routes/category.routes.js';
import * as ChatModel from './models/chat.model.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  }
});

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
app.use("/api/reviews", reviewRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use('/api/booking', bookingFlowRouter);
app.use('/api/chat', chatRouter);
app.use('/api/businesses', businessRouter);
app.use('/api/categories', categoryRouter);
app.get('/', (req, res) => {
  res.send('TourismHub backend running (ESM)');
});

// Socket.io handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`👤 User joined chat: ${chatId}`);
  });

  socket.on('join_user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`🔑 User joined their own room: user_${userId}`);
  });

  socket.on('send_message', async (data) => {
    // data: { chatId, senderId, content }
    try {
      console.log('✉️ Message received:', data);
      const savedMessage = await ChatModel.saveMessage(data.chatId, data.senderId, data.content);

      // Get chat details to find participants
      const chat = await ChatModel.getChatById(data.chatId);
      if (chat) {
        // Emit to the specific chat room
        // Emit to the specific chat room for currently active chat window
        io.to(`chat_${data.chatId}`).emit('receive_message', savedMessage);

        // Also emit to both participants' private rooms for global notifications/popups
        io.to(`user_${chat.user_id}`).emit('new_message_notification', savedMessage);
        io.to(`user_${chat.vendor_id}`).emit('new_message_notification', savedMessage);

        // Emit to business staff if applicable
        if (chat.business_id) {
          try {
            const staffIds = await ChatModel.getBusinessStaffIds(chat.business_id);
            staffIds.forEach(staffId => {
              // Don't emit to vendor_id again if they are also in staff list (unlikely but safe check)
              if (staffId !== chat.vendor_id) {
                io.to(`user_${staffId}`).emit('new_message_notification', savedMessage);
              }
            });
          } catch (staffErr) {
            console.error("Error notifying staff:", staffErr);
          }
        }
      }
    } catch (err) {
      console.error("❌ Error saving socket message:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

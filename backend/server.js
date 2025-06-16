// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Mood from './models/Mood.js';
import moodRoutes from './routes/moodModule.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/module/mood', moodRoutes);

// // Simple schema
// const UserSchema = new mongoose.Schema({
//   name: String,
//   email: String
// });
// const User = mongoose.model('User', UserSchema);

// POST /api/mood - Add mood entry


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('❌ MongoDB connection error:', err));



// Test route
app.post('/test', async (req, res) => {
  try {
    const user = new User({
      name: req.body.name,
      email: req.body.email
    });
    await user.save();
    res.status(201).json({ message: 'User saved!', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

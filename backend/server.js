// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:8081', 'http://192.168.7.8:8081', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    
    // Drop old index and create new compound index
    try {
      const DailyActivity = require('./models/DailyActivity');
      await DailyActivity.collection.dropIndex('date_1')
        .catch(err => {
          if (err.code !== 26) { // Ignore if index doesn't exist
            console.error('Error dropping old index:', err);
          }
        });
      
      // Create new compound index
      await DailyActivity.collection.createIndex(
        { uid: 1, date: 1 },
        { unique: true, name: 'uid_date_unique' }
      );
      console.log('✅ Indexes updated successfully');
    } catch (err) {
      console.error('❌ Error managing indexes:', err);
    }
  })
  .catch(err => console.log('❌ MongoDB connection error:', err));

// Simple schema
const User = require('./models/User');
const DailyActivity = require('./models/DailyActivity');



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

// Daily Activity routes
app.post('/daily-activity', async (req, res) => {
  try {
    const { waterIntake, meals, sleepTime, wakeTime, date, uid } = req.body;
    console.log('Received data:', req.body);

    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Try to find existing activity for this user and date
    let dailyActivity = await DailyActivity.findOne({ uid, date });

    if (dailyActivity) {
      // Update existing activity
      dailyActivity.waterIntake = waterIntake;
      dailyActivity.meals = meals;
      dailyActivity.sleep = {
        bedtime: sleepTime,
        wakeup: wakeTime,
        duration: dailyActivity.sleep?.duration || 0
      };
    } else {
      // Create new activity
      dailyActivity = new DailyActivity({
        uid,
        waterIntake,
        meals,
        sleep: {
          bedtime: sleepTime,
          wakeup: wakeTime,
          duration: 0
        },
        date,
      });
    }

    console.log('Activity object:', dailyActivity);
    const savedActivity = await dailyActivity.save();
    console.log('Saved activity:', savedActivity);
    
    res.status(201).json({ 
      message: dailyActivity.isNew ? 'Daily activity created!' : 'Daily activity updated!', 
      dailyActivity: savedActivity 
    });
  } catch (err) {
    console.error('Error saving daily activity:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

// GET route to fetch daily activities
app.get('/daily-activity', async (req, res) => {
  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const activities = await DailyActivity.find({ uid }).sort({ date: -1 });
    res.status(200).json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ 
      error: err.message,
      details: err.stack
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

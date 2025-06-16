import express from 'express';
import Mood from '../models/Mood.js';
import admin from '../firebaseAdmin.js';

const router = express.Router();

// Middleware to verify Firebase token
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

//GET mood
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const moods = await Mood.find({ uid: req.user.uid }).sort({ date: -1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST mood
router.post('/', verifyFirebaseToken, async (req, res) => {
  const { mood, note } = req.body;
  const uid = req.user.uid;

  try {
    const newEntry = new Mood({ uid, mood, note });
    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET moods for logged-in user
router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const moods = await Mood.find({ uid: req.user.uid }).sort({ date: -1 });
    res.json(moods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

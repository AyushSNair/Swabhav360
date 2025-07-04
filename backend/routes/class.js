import express from 'express';
import admin from '../firebaseAdmin.js';

const router = express.Router();
const classesCollection = admin.firestore().collection('classes');

router.post('/create', async (req, res) => {
    try {
        const { name, description, teacherId } = req.body;
        const classData = { name };
        if (description !== undefined) classData.description = description;
        if (teacherId !== undefined) classData.teacherId = teacherId;
        const classDoc = await classesCollection.add(classData);
        res.json({ id: classDoc.id, name, description: description ?? "", teacherId: teacherId ?? "" });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ error: 'Failed to create class', details: error.message });
    }
})

router.get('/list', async (req, res) => {
    try {
        const snapshot = await classesCollection.get();
        const classes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json(classes);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
})

router.post('/:classId/add-student', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        const classDoc = await classesCollection.doc(classId).get();
        const classData = classDoc.data();
        if (!classData) {
            return res.status(404).json({ error: 'Class not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add student to class' });
    }
})

router.post('/:classId/remove-student', async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        const classDoc = await classesCollection.doc(classId).get();
        const classData = classDoc.data();
        if (!classData) {
            return res.status(404).json({ error: 'Class not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove student from class' });
    }
})



export default router;
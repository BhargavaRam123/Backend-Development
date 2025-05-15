import express from 'express';
import {
    createNote,
    getUserNotes,
    getNoteById,
    updateNote,
    deleteNote,
    deleteMultipleNotes
} from '../controllers/notes.js';
import { authenticate } from '../middleware/index.js';

const router = express.Router();

router.use(authenticate);

router.post('/createnotes', createNote);

router.get('/getnotes', getUserNotes);

router.get('/:noteId', getNoteById);

router.put('/:noteId', updateNote);

router.delete('/:noteId', deleteNote);

router.delete('/bulk', deleteMultipleNotes);

export default router;
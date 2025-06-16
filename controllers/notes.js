import { Note } from '../models/user.model.js';
import User from '../models/user.model.js';

// Create a new note
export const createNote = async (req, res) => {
    try {
        const { title, body } = req.body;
        const userId = req.user.userId; // From authentication middleware

        // Validate input
        if (!title || !body) {
            return res.status(400).json({
                success: false,
                message: 'Title and body are required'
            });
        }

        // Create new note
        const note = new Note({
            title,
            body,
            userId
        });

        // Save the note
        await note.save();

        // Add note reference to user's notes array
        await User.findByIdAndUpdate(
            userId,
            { $push: { notes: note._id } },
            { new: true }
        );

        res.status(201).json({
            success: true,
            message: 'Note created successfully',
            note
        });

    } catch (error) {
        console.error('Create note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating note'
        });
    }
};

// Get all notes for a user
export const getUserNotes = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { page = 1, limit = 10, search = '' } = req.query;

        // Build query
        const query = { userId };
        
        // Add search functionality if search parameter provided
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { body: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get notes with pagination
        const notes = await Note.find(query)
            .sort({ createdAt: -1 }) // Most recent first
            .limit(limit * 1)
            .skip(skip);

        // Get total count for pagination
        const count = await Note.countDocuments(query);

        res.status(200).json({
            success: true,
            notes,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notes'
        });
    }
};

// Get a single note by ID
export const getNoteById = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find note and verify ownership
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            note
        });

    } catch (error) {
        console.error('Get note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching note'
        });
    }
};

// Update a note
export const updateNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { title, body } = req.body;
        const userId = req.user.userId;

        // Validate at least one field is provided
        if (!title && !body) {
            return res.status(400).json({
                success: false,
                message: 'Provide title or body to update'
            });
        }

        // Build update object
        const updateFields = {};
        if (title) updateFields.title = title;
        if (body) updateFields.body = body;
        updateFields.updatedAt = Date.now();

        // Find and update note (checking ownership)
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            updateFields,
            { new: true, runValidators: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Note updated successfully',
            note
        });

    } catch (error) {
        console.error('Update note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating note'
        });
    }
};

// Delete a note
export const deleteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find and delete note (checking ownership)
        const note = await Note.findOneAndDelete({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Remove note reference from user's notes array
        await User.findByIdAndUpdate(
            userId,
            { $pull: { notes: noteId } }
        );

        res.status(200).json({
            success: true,
            message: 'Note deleted successfully'
        });

    } catch (error) {
        console.error('Delete note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting note'
        });
    }
};

// Delete multiple notes
export const deleteMultipleNotes = async (req, res) => {
    try {
        const { noteIds } = req.body;
        const userId = req.user.userId;

        if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of note IDs'
            });
        }

        // Delete all notes that belong to the user
        const deleteResult = await Note.deleteMany({
            _id: { $in: noteIds },
            userId
        });

        // Remove note references from user's notes array
        await User.findByIdAndUpdate(
            userId,
            { $pull: { notes: { $in: noteIds } } }
        );

        res.status(200).json({
            success: true,
            message: `${deleteResult.deletedCount} notes deleted successfully`,
            deletedCount: deleteResult.deletedCount
        });

    } catch (error) {
        console.error('Delete multiple notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting notes'
        });
    }
};
import { Note } from '../models/user.model.js';
import User from '../models/user.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';

// 1. TAGS FUNCTIONALITY
// Add tags to a note
export const addTagsToNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { tags } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({
                success: false,
                message: 'Tags must be provided as an array'
            });
        }

        // Normalize tags (lowercase, trim, unique)
        const normalizedTags = [...new Set(tags.map(tag => tag.toLowerCase().trim()))];

        // Find and update note (checking ownership)
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            { $addToSet: { tags: { $each: normalizedTags } } },
            { new: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tags added successfully',
            note
        });

    } catch (error) {
        console.error('Add tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding tags'
        });
    }
};

// Remove tags from a note
export const removeTagsFromNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { tags } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({
                success: false,
                message: 'Tags must be provided as an array'
            });
        }

        // Normalize tags (lowercase, trim)
        const normalizedTags = tags.map(tag => tag.toLowerCase().trim());

        // Find and update note (checking ownership)
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            { $pull: { tags: { $in: normalizedTags } } },
            { new: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tags removed successfully',
            note
        });

    } catch (error) {
        console.error('Remove tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing tags'
        });
    }
};

// Get notes by tag
export const getNotesByTag = async (req, res) => {
    try {
        const { tag } = req.params;
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Find notes with the specified tag
        const notes = await Note.find({
            userId,
            tags: tag.toLowerCase().trim()
        })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip(skip);

        // Get total count for pagination
        const count = await Note.countDocuments({
            userId,
            tags: tag.toLowerCase().trim()
        });

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
        console.error('Get notes by tag error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notes by tag'
        });
    }
};

// Get all user tags
export const getUserTags = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Aggregate to get unique tags across all user notes
        const tagResult = await Note.aggregate([
            // Match only user's notes
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            // Unwind the tags array
            { $unwind: "$tags" },
            // Group by tag and count occurrences
            {
                $group: {
                    _id: "$tags",
                    count: { $sum: 1 }
                }
            },
            // Sort by count descending
            { $sort: { count: -1 } },
            // Project to rename fields
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            tags: tagResult
        });

    } catch (error) {
        console.error('Get user tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user tags'
        });
    }
};

// 2. PINNING FUNCTIONALITY
// Toggle pin status
export const togglePinNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note and get current pin status
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Toggle the pin status
        note.isPinned = !note.isPinned;
        await note.save();

        res.status(200).json({
            success: true,
            message: note.isPinned ? 'Note pinned successfully' : 'Note unpinned successfully',
            note
        });

    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling pin status'
        });
    }
};

// Get pinned notes
export const getPinnedNotes = async (req, res) => {
    try {
        const userId = req.user.userId;

        const pinnedNotes = await Note.find({
            userId,
            isPinned: true
        }).sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            pinnedNotes
        });

    } catch (error) {
        console.error('Get pinned notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pinned notes'
        });
    }
};

// 3. EXPORT FUNCTIONALITY
// Export note as PDF
export const exportNoteToPDF = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create a PDF document
        const doc = new PDFDocument();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=note-${noteId}.pdf`);

        // Pipe the PDF directly to the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(20).text(note.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Created: ${note.createdAt.toLocaleString()}`);
        doc.fontSize(12).text(`Last Updated: ${note.updatedAt.toLocaleString()}`);
        
        // Add tags if they exist
        if (note.tags && note.tags.length > 0) {
            doc.moveDown();
            doc.fontSize(14).text('Tags:');
            doc.fontSize(12).text(note.tags.join(', '));
        }
        
        doc.moveDown();
        doc.fontSize(14).text('Content:');
        doc.moveDown();
        doc.fontSize(12).text(note.body);

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('Export note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting note to PDF'
        });
    }
};

// Export note as Markdown
export const exportNoteToMarkdown = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create markdown content
        let markdownContent = `# ${note.title}\n\n`;
        markdownContent += `Created: ${note.createdAt.toLocaleString()}\n`;
        markdownContent += `Last Updated: ${note.updatedAt.toLocaleString()}\n\n`;
        
        // Add tags if they exist
        if (note.tags && note.tags.length > 0) {
            markdownContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
        }
        
        markdownContent += `## Content\n\n${note.body}\n`;

        // Set response headers
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename=note-${noteId}.md`);

        // Send the markdown content
        res.send(markdownContent);

    } catch (error) {
        console.error('Export note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting note to Markdown'
        });
    }
};

// 4. VERSION HISTORY
// Save a new version of a note
export const saveNoteVersion = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create a new version entry
        const versionData = {
            title: note.title,
            body: note.body,
            createdAt: new Date()
        };

        // Add version to note's version history
        note.versions.push(versionData);
        await note.save();

        res.status(200).json({
            success: true,
            message: 'Note version saved successfully',
            versionId: note.versions[note.versions.length - 1]._id
        });

    } catch (error) {
        console.error('Save version error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving note version'
        });
    }
};

// Get note version history
export const getNoteVersions = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId }, { versions: 1, title: 1 });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            noteTitle: note.title,
            versions: note.versions.map(version => ({
                versionId: version._id,
                title: version.title,
                createdAt: version.createdAt
            }))
        });

    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching note versions'
        });
    }
};

// Restore a note to a previous version
export const restoreNoteVersion = async (req, res) => {
    try {
        const { noteId, versionId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Find the specific version
        const version = note.versions.id(versionId);
        
        if (!version) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        // Save current state as a new version before restoring
        note.versions.push({
            title: note.title,
            body: note.body,
            createdAt: new Date()
        });

        // Restore the note to the selected version
        note.title = version.title;
        note.body = version.body;
        note.updatedAt = Date.now();

        await note.save();

        res.status(200).json({
            success: true,
            message: 'Note restored to previous version',
            note: {
                _id: note._id,
                title: note.title,
                body: note.body,
                updatedAt: note.updatedAt
            }
        });

    } catch (error) {
        console.error('Restore version error:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring note version'
        });
    }
};

// 5. REMINDERS
// Add a reminder to a note
export const addNoteReminder = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { reminderDate, reminderText } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!reminderDate) {
            return res.status(400).json({
                success: false,
                message: 'Reminder date is required'
            });
        }

        // Parse the reminder date
        const reminderTime = new Date(reminderDate);
        
        // Ensure the reminder date is in the future
        if (reminderTime <= new Date()) {
            return res.status(400).json({
                success: false,
                message: 'Reminder date must be in the future'
            });
        }

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Add reminder to note
        note.reminder = {
            date: reminderTime,
            text: reminderText || `Reminder for: ${note.title}`,
            isCompleted: false
        };

        await note.save();

        res.status(200).json({
            success: true,
            message: 'Reminder added successfully',
            reminder: note.reminder
        });

    } catch (error) {
        console.error('Add reminder error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding reminder'
        });
    }
};

// Get upcoming reminders for a user
export const getUpcomingReminders = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 10 } = req.query;

        // Find notes with uncompleted reminders and upcoming dates
        const notes = await Note.find({
            userId,
            'reminder.date': { $gte: new Date() },
            'reminder.isCompleted': false
        })
            .select('title reminder')
            .sort({ 'reminder.date': 1 })
            .limit(parseInt(limit));

        const reminders = notes.map(note => ({
            noteId: note._id,
            noteTitle: note.title,
            reminderDate: note.reminder.date,
            reminderText: note.reminder.text
        }));

        res.status(200).json({
            success: true,
            reminders
        });

    } catch (error) {
        console.error('Get reminders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reminders'
        });
    }
};

// Mark a reminder as completed
export const completeReminder = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        if (!note.reminder) {
            return res.status(404).json({
                success: false,
                message: 'No reminder found for this note'
            });
        }

        // Mark reminder as completed
        note.reminder.isCompleted = true;
        await note.save();

        res.status(200).json({
            success: true,
            message: 'Reminder marked as completed'
        });

    } catch (error) {
        console.error('Complete reminder error:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing reminder'
        });
    }
};

// 6. FAVORITES
// Toggle favorite status
export const toggleFavoriteNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Toggle the favorite status
        note.isFavorite = !note.isFavorite;
        await note.save();

        res.status(200).json({
            success: true,
            message: note.isFavorite ? 'Note added to favorites' : 'Note removed from favorites',
            note
        });

    } catch (error) {
        console.error('Toggle favorite error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling favorite status'
        });
    }
};

// Get favorite notes
export const getFavoriteNotes = async (req, res) => {
    try {
        const userId = req.user.userId;
import { Note } from '../models/user.model.js';
import User from '../models/user.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Readable } from 'stream';
import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';

// 1. TAGS FUNCTIONALITY
// Add tags to a note
export const addTagsToNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { tags } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({
                success: false,
                message: 'Tags must be provided as an array'
            });
        }

        // Normalize tags (lowercase, trim, unique)
        const normalizedTags = [...new Set(tags.map(tag => tag.toLowerCase().trim()))];

        // Find and update note (checking ownership)
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            { $addToSet: { tags: { $each: normalizedTags } } },
            { new: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tags added successfully',
            note
        });

    } catch (error) {
        console.error('Add tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding tags'
        });
    }
};

// Remove tags from a note
export const removeTagsFromNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const { tags } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!tags || !Array.isArray(tags)) {
            return res.status(400).json({
                success: false,
                message: 'Tags must be provided as an array'
            });
        }

        // Normalize tags (lowercase, trim)
        const normalizedTags = tags.map(tag => tag.toLowerCase().trim());

        // Find and update note (checking ownership)
        const note = await Note.findOneAndUpdate(
            { _id: noteId, userId },
            { $pull: { tags: { $in: normalizedTags } } },
            { new: true }
        );

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tags removed successfully',
            note
        });

    } catch (error) {
        console.error('Remove tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing tags'
        });
    }
};

// Get notes by tag
export const getNotesByTag = async (req, res) => {
    try {
        const { tag } = req.params;
        const userId = req.user.userId;
        const { page = 1, limit = 10 } = req.query;

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Find notes with the specified tag
        const notes = await Note.find({
            userId,
            tags: tag.toLowerCase().trim()
        })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip(skip);

        // Get total count for pagination
        const count = await Note.countDocuments({
            userId,
            tags: tag.toLowerCase().trim()
        });

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
        console.error('Get notes by tag error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching notes by tag'
        });
    }
};

// Get all user tags
export const getUserTags = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Aggregate to get unique tags across all user notes
        const tagResult = await Note.aggregate([
            // Match only user's notes
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            // Unwind the tags array
            { $unwind: "$tags" },
            // Group by tag and count occurrences
            {
                $group: {
                    _id: "$tags",
                    count: { $sum: 1 }
                }
            },
            // Sort by count descending
            { $sort: { count: -1 } },
            // Project to rename fields
            {
                $project: {
                    _id: 0,
                    name: "$_id",
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            tags: tagResult
        });

    } catch (error) {
        console.error('Get user tags error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user tags'
        });
    }
};

// 2. PINNING FUNCTIONALITY
// Toggle pin status
export const togglePinNote = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note and get current pin status
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Toggle the pin status
        note.isPinned = !note.isPinned;
        await note.save();

        res.status(200).json({
            success: true,
            message: note.isPinned ? 'Note pinned successfully' : 'Note unpinned successfully',
            note
        });

    } catch (error) {
        console.error('Toggle pin error:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling pin status'
        });
    }
};

// Get pinned notes
export const getPinnedNotes = async (req, res) => {
    try {
        const userId = req.user.userId;

        const pinnedNotes = await Note.find({
            userId,
            isPinned: true
        }).sort({ updatedAt: -1 });

        res.status(200).json({
            success: true,
            pinnedNotes
        });

    } catch (error) {
        console.error('Get pinned notes error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pinned notes'
        });
    }
};

// 3. EXPORT FUNCTIONALITY
// Export note as PDF
export const exportNoteToPDF = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create a PDF document
        const doc = new PDFDocument();

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=note-${noteId}.pdf`);

        // Pipe the PDF directly to the response
        doc.pipe(res);

        // Add content to the PDF
        doc.fontSize(20).text(note.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Created: ${note.createdAt.toLocaleString()}`);
        doc.fontSize(12).text(`Last Updated: ${note.updatedAt.toLocaleString()}`);
        
        // Add tags if they exist
        if (note.tags && note.tags.length > 0) {
            doc.moveDown();
            doc.fontSize(14).text('Tags:');
            doc.fontSize(12).text(note.tags.join(', '));
        }
        
        doc.moveDown();
        doc.fontSize(14).text('Content:');
        doc.moveDown();
        doc.fontSize(12).text(note.body);

        // Finalize the PDF
        doc.end();

    } catch (error) {
        console.error('Export note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting note to PDF'
        });
    }
};

// Export note as Markdown
export const exportNoteToMarkdown = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create markdown content
        let markdownContent = `# ${note.title}\n\n`;
        markdownContent += `Created: ${note.createdAt.toLocaleString()}\n`;
        markdownContent += `Last Updated: ${note.updatedAt.toLocaleString()}\n\n`;
        
        // Add tags if they exist
        if (note.tags && note.tags.length > 0) {
            markdownContent += `**Tags:** ${note.tags.join(', ')}\n\n`;
        }
        
        markdownContent += `## Content\n\n${note.body}\n`;

        // Set response headers
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename=note-${noteId}.md`);

        // Send the markdown content
        res.send(markdownContent);

    } catch (error) {
        console.error('Export note error:', error);
        res.status(500).json({
            success: false,
            message: 'Error exporting note to Markdown'
        });
    }
};

// 4. VERSION HISTORY
// Save a new version of a note
export const saveNoteVersion = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Create a new version entry
        const versionData = {
            title: note.title,
            body: note.body,
            createdAt: new Date()
        };

        // Add version to note's version history
        note.versions.push(versionData);
        await note.save();

        res.status(200).json({
            success: true,
            message: 'Note version saved successfully',
            versionId: note.versions[note.versions.length - 1]._id
        });

    } catch (error) {
        console.error('Save version error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving note version'
        });
    }
};

// Get note version history
export const getNoteVersions = async (req, res) => {
    try {
        const { noteId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId }, { versions: 1, title: 1 });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        res.status(200).json({
            success: true,
            noteTitle: note.title,
            versions: note.versions.map(version => ({
                versionId: version._id,
                title: version.title,
                createdAt: version.createdAt
            }))
        });

    } catch (error) {
        console.error('Get versions error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching note versions'
        });
    }
};

// Restore a note to a previous version
export const restoreNoteVersion = async (req, res) => {
    try {
        const { noteId, versionId } = req.params;
        const userId = req.user.userId;

        // Find the note
        const note = await Note.findOne({ _id: noteId, userId });

        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Find the specific version
        const version = note.versions.id(versionId);
        
        if (!version) {
            return res.status(404).json({
                success: false,
                message: 'Version not found'
            });
        }

        // Save current state as a new version before restoring
        note.versions.push({
            title: note.title,
            body: note.body,
            createdAt: new Date()
        });

        // Restore the note to the selected version
        note.title = version.title;
        note.body = version.body;
        note.updatedAt = Date.now();

        await note.save();

        res.status(200).json({
            success: true,
            message: 'Note restored to previous version',
            note: {
                _id: note._id,
                title: note.title,
                body: note.body,
                updatedAt: note.updatedAt
            }
        });

    } catch (error) {
        console.error('Restore version error:', error);
        res.status(500).json({
            success: false,
            message: 'Error restoring note version'
        });
    }
}
import mongoose from "mongoose";

// Define the Note schema as a separate collection
const noteSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    body: { 
        type: String, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Define the User schema with notes references and token
const userSchema = new mongoose.Schema({
    firstname: { 
        type: String, 
        required: true 
    },
    lastname: { 
        type: String, 
        required: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    contactNumber: { 
        type: String, 
        required: true 
    },
    token: { 
        type: String 
    },
    notes: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Note' 
    }]  // Storing references to Note documents
});

// Create the models
const User = mongoose.model('User', userSchema);
const Note = mongoose.model('Note', noteSchema);

export default User;
export { Note };
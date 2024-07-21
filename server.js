const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors()); 

mongoose.connect('mongodb+srv://sidhanti:sidhanti@cluster0.yherhyr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['doctor', 'patient'] }, 
    basicInfo: {
        fullName: String,
        dateOfBirth: String,
        gender: String,
        contact: String,
        email: String,
        address: String
    },
    specialization: String, 
    medicalLicense: String, 
    employment: String, 
    availability: String, 
    medicalHistory: { 
        conditions: String,
        allergies: String,
        medications: String,
        surgeries: String,
        familyHistory: String
    },
    insuranceInfo: { 
        provider: String,
        policyNumber: String
    },
    emergencyContact: { 
        name: String,
        phone: String
    }
});

const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    text: String,
    image: String,
    likes: { type: Number, default: 0 },
    comments: [String],
    role: { type: String, enum: ['doctor', 'patient'], default: 'doctor' } // Enumerate role values
});

const Post = mongoose.model('Post', postSchema);



app.post('/api/signup', async (req, res) => {
    try {
        const { username, password, role, basicInfo, specialization, medicalLicense, employment, availability } = req.body;

        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already taken' });
        }

        // Create a new user with role-specific fields
        let newUser;
        if (role === 'doctor') {
            newUser = new User({
                username,
                password,
                role,
                basicInfo,
                specialization,
                medicalLicense,
                employment,
                availability
            });
        } else if (role === 'patient') {
            const { medicalHistory, insuranceInfo, emergencyContact } = req.body;
            newUser = new User({
                username,
                password,
                role,
                basicInfo,
                medicalHistory,
                insuranceInfo,
                emergencyContact
            });
        } else {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Save the new user to the database
        const savedUser = await newUser.save();

        res.json({ message: 'Signup successful', user: savedUser });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (password !== user.password) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        res.json({ message: 'Login successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/patient-posts', async (req, res) => {
    try {
        const patientPosts = await Post.find({ role: 'patient' }).populate('likes comments');

        res.json(patientPosts);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/doctor-posts', async (req, res) => {
    try {
        const doctorPosts = await Post.find({ role: 'doctor' });
        res.json(doctorPosts);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/posts', async (req, res) => {
    const { text, image, role } = req.body;
    try {
        const newPost = new Post({ text, image, role }); // Use the role from the request body
        await newPost.save();
        res.json({ message: 'Post created successfully', post: newPost });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/api/posts/:id/like', async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });
        res.json({ message: 'Post liked successfully', post });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/api/posts/:id/unlike', async (req, res) => {
    const { id } = req.params;
    try {
        const post = await Post.findByIdAndUpdate(id, { $inc: { likes: -1 } }, { new: true });
        res.json({ message: 'Post unliked successfully', post });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/api/posts/:id/comment', async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    try {
        const post = await Post.findByIdAndUpdate(id, { $push: { comments: comment } }, { new: true });
        res.json({ message: 'Comment added successfully', post });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

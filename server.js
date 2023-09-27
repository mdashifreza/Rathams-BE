const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const port = 8897;
const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://rathmDB:ocPj0NYCzVtSCtuY@cluster0.mcrtdl1.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const Dean = mongoose.model('Dean', {
    universityId: String,
    password: String,
});

const Student = mongoose.model('Student', {
    universityId: String,
    password: String,
});

const Session = mongoose.model('Session', {
    day: String,
    time: String,
    booked: { type: Boolean, default: false },
});

const Booking = mongoose.model('Booking', {
    studentName: String,
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    timestamp: Date,
});

const secret_key = 'asavjvsfsy687256178hvh';

const router = express.Router();

// Endpoint to create a new session
router.post('/create-session', async (req, res) => {
    try {
        const { day, time } = req.body;

        // Create a new session and save it to MongoDB
        const session = await Session.create({ day, time });

        res.status(201).json({ message: 'Session created successfully', session });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

// TO SEE ALL AVALAIBLE SESSION WITH THE DEAN
router.get('/dean-sessions', async (req, res) => {
    try {
        const deanSessions = await Session.find({ booked: false });
        res.status(200).json({ sessions: deanSessions });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

//dean signup
router.post('/dean-signup', async (req, res) => {
    try {
        const { universityId, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await Dean.create({ universityId, password: hashedPassword });
        
        res.status(201).json({ message: 'Dean signup successful' });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

router.post('/dean-login', async (req, res) => {
    try {
        const { universityId, password } = req.body;
        const dean = await Dean.findOne({ universityId });

        if (!dean) {
            res.status(401).json({ error: 'Dean is not available' });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, dean.password);

        if (!passwordMatch) {
            res.status(401).json({ error: 'Password match error' });
            return;
        }

        const deanToken = jwt.sign({ universityId }, secret_key, { expiresIn: '1h' });
        res.status(200).json({ token: deanToken });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

// to see all pending sessions for a dean
router.post('/pending-sessions', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const isAuthenticated = await verifyToken(token);

        if (!isAuthenticated) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const pendingSessions = await Booking.find({});
        res.status(200).json({ sessions: pendingSessions });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

//book the session
router.post('/book-session', async (req, res) => {
    try {
        const { token, session_id, studentName } = req.body;
        const isAuthenticated = await verifyToken(token);

        if (!isAuthenticated) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Ensure that the 'session' parameter is a valid ObjectId string
        if (!mongoose.Types.ObjectId.isValid(session_id)) {
            res.status(400).json({ error: 'Invalid session ObjectId' });
            return;
        }

        // Check if the session exists in the Session collection
        const existingSession = await Session.findById(session_id);

        if (!existingSession) {
            res.status(400).json({ error: 'Session not found' });
            return;
        }
        // Check if the session has already been booked
        if (existingSession.booked) {
            res.status(400).json({ error: 'Session has already been booked' });
            return;
        }
        // Update the 'booked' field for the session
            existingSession.booked = true;
            await existingSession.save();
        // Create a booking with the valid session ObjectId
        await Booking.create({ studentName, session_id: existingSession._id, timestamp: new Date() });

        res.status(200).json({ message: 'Session booked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: 'An error has occurred' });
    }
});

//student login
router.post('/student-login', async (req, res) => {
    try {
        const { universityId, password } = req.body;
        const student = await Student.findOne({ universityId });

        if (!student) {
            res.status(401).json({ error: 'Student is not available' });
            return;
        }

        const passwordMatch = await bcrypt.compare(password, student.password);

        if (!passwordMatch) {
            res.status(401).json({ error: 'Password match error' });
            return;
        }

        const studentToken = jwt.sign({ universityId }, secret_key, { expiresIn: '1h' });
        res.status(200).json({ token: studentToken });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

// student signup
router.post('/student-signup', async (req, res) => {
    try {
        const { universityId, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        await Student.create({ universityId, password: hashedPassword });
        res.status(201).json({ message: 'Student signup successful' });
    } catch (err) {
        res.status(500).json({ err: 'An error has occurred' });
    }
});

async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, secret_key);
        return true;
    } catch (error) {
        return false;
    }
}

app.use('/api', router);

app.listen(port, () => {
    console.log('Server is listening at port:', port);
});

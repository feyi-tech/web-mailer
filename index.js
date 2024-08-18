const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Enable CORS for all origins (adjust as needed)
app.use(cors({
    origin: '*',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization',
}));

app.use(bodyParser.json());

// Middleware to check the bearer token
app.use((req, res, next) => {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header is missing' });
    }

    const token = authHeader.split(' ')[1]; // Extract token

    if (!token || token !== process.env.API_KEY) {
        return res.status(403).json({ error: 'Invalid or missing token' });
    }

    next(); // Proceed if the token is valid
});

app.post('/mailer', async (req, res) => {
    const { from, to, title, body, smtp_server, smtp_port, smtp_user, smtp_pass, email_headers } = req.body;

    console.log(`Data: `, req.body);

    // Input validation
    if (!Array.isArray(to) || to.length === 0 || to.length > 1000) {
        return res.status(400).json({ error: "The 'to' field must be an array with 1 to 1000 email addresses." });
    }
    if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ error: "The 'title' field is required and must be a non-empty string." });
    }
    if (typeof body !== 'string' || body.trim() === '') {
        return res.status(400).json({ error: "The 'body' field is required and must be a non-empty string." });
    }
    if (typeof smtp_server !== 'string' || smtp_server.trim() === '') {
        return res.status(400).json({ error: "The 'smtp_server' field is required and must be a non-empty string." });
    }
    if (typeof smtp_port !== 'number' || smtp_port <= 0) {
        return res.status(400).json({ error: "The 'smtp_port' field is required and must be a positive number." });
    }
    if (typeof smtp_user !== 'string' || smtp_user.trim() === '') {
        return res.status(400).json({ error: "The 'smtp_user' field is required and must be a non-empty string." });
    }
    if (typeof smtp_pass !== 'string' || smtp_pass.trim() === '') {
        return res.status(400).json({ error: "The 'smtp_pass' field is required and must be a non-empty string." });
    }

    // Setup Nodemailer transport
    const transporter = nodemailer.createTransport({
        host: smtp_server,
        port: smtp_port,
        secure: smtp_port === 465, // true for 465, false for other ports
        auth: {
            user: smtp_user,
            pass: smtp_pass
        }
    });

    const sendEmail = async (recipient) => {
        new Promise((resolve, reject) => {
            const mailOptions = {
                from: from, // sender address
                to: recipient, // single recipient
                subject: title, // Subject line
                text: body, // plain text body
                html: body, // html body
                headers: email_headers
            };
        
            transporter.sendMail(mailOptions)
            .then(info => {
                resolve(info)

            })
            .catch(error => {
                reject(error)
            })
        })
    };

    const mailPromises = []
    for (const recipient of to) {
        mailPromises.push(sendEmail(recipient))
    }

    //Send all
    Promise.all(mailPromises)
    .then(results => {
        res.json({ success: true, results: results });
    })
    .catch(error => {
        res.status(500).json({ success: false, error: error.message });
    })
});

// Start the server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
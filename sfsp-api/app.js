require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes')

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '2gb' }));

const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({
    limit: '2gb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '2gb'
}));

app.use('/api', routes);

const server = app.listen(PORT, () => {
    console.log("Server running at http://localhost:" + PORT)
});

server.timeout = 1800000; 
server.keepAliveTimeout = 300000; 
server.headersTimeout = 310000;

module.exports = app;
/* global process */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes')
/* const ratelimit = require('express-rate-limit'); */

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

app.use(express.json({
    limit: '2gb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '2gb'
}));

/* const limiter = ratelimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});

app.use('/api', limiter); */

app.use('/api', routes);

app.listen(PORT, () => {
    console.log("Server running at http://localhost:" + PORT)
});

module.exports = app;
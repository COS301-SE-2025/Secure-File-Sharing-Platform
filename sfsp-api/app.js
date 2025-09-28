/* global process */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes')

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '10mb' }));

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

app.use('/api', routes);

app.listen(PORT, () => {
    console.log("Server running at http://localhost:" + PORT)
});

module.exports = app;
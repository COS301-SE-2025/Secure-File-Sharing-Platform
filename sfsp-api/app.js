const express = require('express');
const userRoutes = require('./routes/userRoutes')
const fileRoutes = require('./routes/fileRoutes');
const app = express();
const PORT = 5000;

app.use(express.json());
app.use('/api', userRoutes);

app.listen(PORT, () => {
    console.log("Server running at http://localhost:"+PORT)
});
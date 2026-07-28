const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const routes = require("./routes");
// const notFound = require("./middlewares/notFound");
// const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());

// Keep this before application routes so uptime monitors and the web client can
// wake the Render instance without going through authentication middleware.
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Backend is running 🚀' });
});

app.use('/auth', authRoutes);
app.use('/', routes);

// app.use(notFound);
// app.use(errorHandler);

module.exports = app;

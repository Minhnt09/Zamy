const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const routes = require("./routes");
const prisma = require('./lib/prisma');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:4200', 'http://127.0.0.1:4200'];
const allowedOrigins = new Set([...developmentOrigins, ...configuredOrigins]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed by CORS'));
    }
}));
app.use(express.json());
morgan.token('safe-path', (req) => String(req.originalUrl || req.path).split('?')[0]);
app.use(morgan(process.env.NODE_ENV === 'production'
    ? ':date[iso] :method :safe-path :status :response-time ms'
    : ':method :safe-path :status :response-time ms'));

// Keep this before application routes so uptime monitors and the web client can
// wake the Render instance without going through authentication middleware.
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/ready', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return res.status(200).json({
            status: 'ready',
            database: 'ok',
            timestamp: new Date().toISOString()
        });
    } catch {
        return res.status(503).json({
            status: 'not_ready',
            database: 'unavailable'
        });
    }
});

app.get('/', (req, res) => {
    res.json({ message: 'Backend is running 🚀' });
});

app.use('/auth', authRoutes);
app.use('/', routes);

if (process.env.NODE_ENV === 'test') {
    app.get('/__test/error', () => {
        const error = new Error('Test-only Prisma failure P2028');
        error.code = 'P2028';
        throw error;
    });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;

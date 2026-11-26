const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./routes/auth.routes');
const routes = require("./routes");
const prisma = require('./lib/prisma');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');
const { sanitizeLogMessage } = require('./utils/sanitizeLogMessage');

const app = express();
// Render forwards requests through one proxy before they reach this Express app.
// Trusting exactly that hop lets rate limiters use the forwarded client IP.
app.set('trust proxy', 1);
const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const developmentOrigins = process.env.NODE_ENV === 'production'
    ? []
    : ['http://localhost:4200', 'http://127.0.0.1:4200'];
const allowedOrigins = new Set([...developmentOrigins, ...configuredOrigins]);

app.use(helmet());
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
        // Check that checkout migrations are present without fetching any order data.
        await prisma.$queryRaw`SELECT idempotency_key, request_hash FROM orders LIMIT 0`;
        return res.status(200).json({
            status: 'ready',
            database: 'ok',
            timestamp: new Date().toISOString(),
            ...(process.env.RENDER_GIT_COMMIT ? { commit: process.env.RENDER_GIT_COMMIT } : {}),
        });
    } catch (error) {
        console.warn('Database readiness check failed', {
            errorName: error?.name || 'Error',
            errorMessage: sanitizeLogMessage(error?.message),
            ...(error?.code ? { errorCode: error.code } : {}),
        });
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

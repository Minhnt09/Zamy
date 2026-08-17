require('dotenv').config();

const app = require('./app');
const prisma = require('./lib/prisma');
const { createGracefulShutdown } = require('./utils/gracefulShutdown');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('Server started', {
        port: Number(PORT),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

const shutdown = createGracefulShutdown({ server, prisma });
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = { server, shutdown };

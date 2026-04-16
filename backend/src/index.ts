import express from 'express';

import type { Request, Response } from 'express';
import cors from 'cors';
import Logger from './logger.js';
import helmet from 'helmet';
import morganMiddleware from './middlewares/morganmiddleware.js';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger.js';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import JobRoutes from './routes/jobs.routes.js';
import profileRoutes from './routes/profile.routes.js';
import eventRoutes from './routes/events.routes.js';
import matchingRoutes from './routes/matching.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import externalJobsRoutes from './routes/externalJobs.routes.js';
import chatbotRoutes from './routes/chatbot.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import notificationRoutes from './routes/notifications.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morganMiddleware);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/auth', authRoutes);
app.use('/jobs', JobRoutes);
app.use('/profile', profileRoutes);
app.use('/events', eventRoutes);
app.use('/matching', matchingRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/external-jobs', externalJobsRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/interviews', interviewRoutes);
app.use('/notifications', notificationRoutes);

app.get('/', (req: Request, res: Response) => {
  Logger.info('Home route accessed', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  res.send('Hello, Typescript');
});

const server = app.listen(PORT, () => {
  Logger.info(`server is running on port ${PORT}, 
        environment: ${process.env.NODE_ENV}, timestamp: 
        ${new Date().toISOString()}`);
});
process.on('SIGTERM', () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    Logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  Logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    Logger.info('Process terminated');
    process.exit(0);
  });
});

export { server, app };

import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { errorHandler } from './middleware/error-handler';
import { requestTracker } from './middleware/request-tracker';

import currencyRoutes from './routes/currencies';
import accountRoutes from './routes/accounts';
import transactionRoutes from './routes/transactions';
import transferRoutes from './routes/transfers';
import reportRoutes from './routes/reports';
import lessonRoutes from './routes/lessons';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestTracker);

// Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin-bottom: 20px }
      .swagger-ui .info .title { font-size: 2em }
    `,
    customSiteTitle: 'REST Academy',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      tagsSorter: (a: string, b: string) => {
        const order = ['Lessons', 'Currencies', 'Accounts', 'Transactions', 'Transfers', 'Reports'];
        return order.indexOf(a) - order.indexOf(b);
      },
    },
  })
);

// OpenAPI spec endpoint
app.get('/openapi.json', (_req, res) => {
  res.json(swaggerSpec);
});

// Routes
app.use('/currencies', currencyRoutes);
app.use('/accounts', accountRoutes);
app.use('/accounts/:accountId/transactions', transactionRoutes);
app.use('/transfers', transferRoutes);
app.use('/reports', reportRoutes);
app.use('/lessons', lessonRoutes);

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns the API status. Use this to verify the server is running.
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root redirect to Swagger UI
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

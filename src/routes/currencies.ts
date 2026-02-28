import { Router, Request, Response } from 'express';
import { currencyStore } from '../store/seed';
import { NotFoundError } from '../models/errors';
import { etagHandler } from '../middleware/etag';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Currency:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           example: USD
 *         name:
 *           type: string
 *           example: US Dollar
 *         symbol:
 *           type: string
 *           example: $
 *         type:
 *           type: string
 *           enum: [fiat, crypto]
 *           example: fiat
 *         decimalPlaces:
 *           type: integer
 *           example: 2
 *         exchangeRateToUSD:
 *           type: number
 *           example: 1.0
 *     ConversionResult:
 *       type: object
 *       properties:
 *         from:
 *           type: string
 *           example: EUR
 *         to:
 *           type: string
 *           example: USD
 *         amount:
 *           type: number
 *           example: 100
 *         convertedAmount:
 *           type: number
 *           example: 108.00
 *         exchangeRate:
 *           type: number
 *           example: 1.08
 */

/**
 * @swagger
 * /currencies:
 *   get:
 *     tags: [Currencies]
 *     summary: List all currencies
 *     description: Returns all available currencies. Supports filtering by type (fiat/crypto).
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [fiat, crypto]
 *         description: Filter by currency type
 *     responses:
 *       200:
 *         description: List of currencies
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Currency'
 */
router.get('/', etagHandler, (_req: Request, res: Response) => {
  let currencies = currencyStore.values();
  const type = _req.query.type as string;

  if (type && (type === 'fiat' || type === 'crypto')) {
    currencies = currencies.filter((c) => c.type === type);
  }

  res.json({ data: currencies });
});

/**
 * @swagger
 * /currencies/convert:
 *   get:
 *     tags: [Currencies]
 *     summary: Convert between currencies
 *     description: Calculates the conversion between two currencies using current exchange rates.
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *         description: Source currency code
 *         example: EUR
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *         description: Target currency code
 *         example: USD
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Amount to convert
 *         example: 100
 *     responses:
 *       200:
 *         description: Conversion result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/ConversionResult'
 *       404:
 *         description: Currency not found
 */
router.get('/convert', (req: Request, res: Response) => {
  const fromCode = (req.query.from as string)?.toUpperCase();
  const toCode = (req.query.to as string)?.toUpperCase();
  const amount = parseFloat(req.query.amount as string);

  const fromCurrency = currencyStore.get(fromCode);
  if (!fromCurrency) throw new NotFoundError('Currency', fromCode);

  const toCurrency = currencyStore.get(toCode);
  if (!toCurrency) throw new NotFoundError('Currency', toCode);

  if (isNaN(amount) || amount <= 0) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Amount must be a positive number' },
    });
    return;
  }

  const amountInUSD = amount * fromCurrency.exchangeRateToUSD;
  const convertedAmount = amountInUSD / toCurrency.exchangeRateToUSD;
  const exchangeRate = fromCurrency.exchangeRateToUSD / toCurrency.exchangeRateToUSD;

  res.json({
    data: {
      from: fromCode,
      to: toCode,
      amount,
      convertedAmount: parseFloat(convertedAmount.toFixed(toCurrency.decimalPlaces)),
      exchangeRate: parseFloat(exchangeRate.toFixed(6)),
    },
  });
});

/**
 * @swagger
 * /currencies/{code}:
 *   get:
 *     tags: [Currencies]
 *     summary: Get currency by code
 *     description: Returns a single currency by its ISO code.
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Currency code (e.g. USD, EUR, BTC)
 *         example: USD
 *     responses:
 *       200:
 *         description: Currency details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Currency'
 *       404:
 *         description: Currency not found
 */
router.get('/:code', etagHandler, (req: Request, res: Response) => {
  const currency = currencyStore.get(req.params.code.toUpperCase());
  if (!currency) {
    throw new NotFoundError('Currency', req.params.code);
  }
  res.json({ data: currency });
});

export default router;

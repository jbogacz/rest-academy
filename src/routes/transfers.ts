import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { accountStore, currencyStore, transactionStore, transferStore } from '../store/seed';
import { NotFoundError, BusinessRuleError, ConflictError } from '../models/errors';
import { validate, required, isPositiveNumber, isString } from '../middleware/validate';
import { parsePagination, paginate } from '../utils/pagination';
import { Transfer, Transaction } from '../models/types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Transfer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         sourceAccountId:
 *           type: string
 *         destinationAccountId:
 *           type: string
 *         amount:
 *           type: number
 *           example: 500.00
 *         sourceCurrency:
 *           type: string
 *           example: USD
 *         destinationCurrency:
 *           type: string
 *           example: EUR
 *         exchangeRate:
 *           type: number
 *           example: 0.9259
 *         convertedAmount:
 *           type: number
 *           example: 462.96
 *         status:
 *           type: string
 *           enum: [pending, completed, failed]
 *         failureReason:
 *           type: string
 *           nullable: true
 *         idempotencyKey:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     CreateTransfer:
 *       type: object
 *       required: [sourceAccountId, destinationAccountId, amount]
 *       properties:
 *         sourceAccountId:
 *           type: string
 *           example: acc-001
 *         destinationAccountId:
 *           type: string
 *           example: acc-003
 *         amount:
 *           type: number
 *           example: 500.00
 *           description: Amount in source account's currency
 *         description:
 *           type: string
 *           example: Payment for services
 *         idempotencyKey:
 *           type: string
 *           example: txn-unique-key-123
 *           description: Optional key to prevent duplicate transfers. If a transfer with the same key already exists, the original transfer is returned.
 */

/**
 * @swagger
 * /transfers:
 *   get:
 *     tags: [Transfers]
 *     summary: List all transfers
 *     description: Returns a paginated list of all transfers. Supports filtering by status.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, failed]
 *         description: Filter by transfer status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of transfers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 */
router.get('/', (req: Request, res: Response) => {
  let transfers = transferStore.getAll();

  const status = req.query.status as string;
  if (status) transfers = transfers.filter((t) => t.status === status);

  const pagination = parsePagination(req);
  const { items, total } = paginate(transfers, pagination);

  res.setHeader('X-Total-Count', total);
  res.json({
    data: items,
    meta: { total, limit: pagination.limit, offset: pagination.offset },
  });
});

/**
 * @swagger
 * /transfers/{id}:
 *   get:
 *     tags: [Transfers]
 *     summary: Get transfer by ID
 *     description: Returns a single transfer by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transfer ID
 *     responses:
 *       200:
 *         description: Transfer details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Transfer'
 *       404:
 *         description: Transfer not found
 */
router.get('/:id', (req: Request, res: Response) => {
  const transfer = transferStore.getById(req.params.id);
  if (!transfer) throw new NotFoundError('Transfer', req.params.id);
  res.json({ data: transfer });
});

/**
 * @swagger
 * /transfers:
 *   post:
 *     tags: [Transfers]
 *     summary: Create a transfer between accounts
 *     description: |
 *       Initiates a transfer between two accounts. The transfer is processed immediately (synchronous).
 *
 *       **Business rules:**
 *       - Source and destination accounts must exist and be active
 *       - Cannot transfer to the same account
 *       - Source account must have sufficient funds (unless credit type)
 *       - Cross-currency transfers are automatically converted at current exchange rate
 *       - Providing an `idempotencyKey` prevents duplicate transfers - if the same key is used again, the original transfer is returned with 200 instead of creating a new one
 *
 *       **Side effects:**
 *       - Two transactions are created automatically (transfer_out on source, transfer_in on destination)
 *       - Account balances are updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransfer'
 *     responses:
 *       201:
 *         description: Transfer created and completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Transfer'
 *       200:
 *         description: Duplicate idempotency key - returning existing transfer
 *       404:
 *         description: Account not found
 *       422:
 *         description: Business rule violation
 */
router.post(
  '/',
  validate(
    required('sourceAccountId', 'destinationAccountId', 'amount'),
    isPositiveNumber('amount'),
    isString('idempotencyKey')
  ),
  (req: Request, res: Response) => {
    const { sourceAccountId, destinationAccountId, amount, description, idempotencyKey } = req.body;

    // Check idempotency
    if (idempotencyKey) {
      const existing = transferStore.filter((t) => t.idempotencyKey === idempotencyKey);
      if (existing.length > 0) {
        res.status(200).json({ data: existing[0] });
        return;
      }
    }

    // Validate accounts
    if (sourceAccountId === destinationAccountId) {
      throw new BusinessRuleError('SAME_ACCOUNT', 'Cannot transfer to the same account');
    }

    const sourceAccount = accountStore.getById(sourceAccountId);
    if (!sourceAccount) throw new NotFoundError('Source account', sourceAccountId);

    const destAccount = accountStore.getById(destinationAccountId);
    if (!destAccount) throw new NotFoundError('Destination account', destinationAccountId);

    if (sourceAccount.status !== 'active') {
      throw new BusinessRuleError(
        'ACCOUNT_NOT_ACTIVE',
        `Source account is ${sourceAccount.status}. Only active accounts can send transfers.`,
        { accountId: sourceAccountId, status: sourceAccount.status }
      );
    }

    if (destAccount.status !== 'active') {
      throw new BusinessRuleError(
        'ACCOUNT_NOT_ACTIVE',
        `Destination account is ${destAccount.status}. Only active accounts can receive transfers.`,
        { accountId: destinationAccountId, status: destAccount.status }
      );
    }

    // Check funds
    if (sourceAccount.type !== 'credit' && sourceAccount.balance < amount) {
      throw new BusinessRuleError('INSUFFICIENT_FUNDS', 'Insufficient funds for this transfer', {
        available: sourceAccount.balance,
        requested: amount,
      });
    }

    // Calculate exchange rate
    const sourceCurrency = currencyStore.get(sourceAccount.currency)!;
    const destCurrency = currencyStore.get(destAccount.currency)!;
    const exchangeRate = sourceCurrency.exchangeRateToUSD / destCurrency.exchangeRateToUSD;
    const convertedAmount = parseFloat((amount * exchangeRate).toFixed(destCurrency.decimalPlaces));

    const now = new Date().toISOString();
    const transferId = uuid();

    // Create transfer
    const transfer: Transfer = {
      id: transferId,
      sourceAccountId,
      destinationAccountId,
      amount,
      sourceCurrency: sourceAccount.currency,
      destinationCurrency: destAccount.currency,
      exchangeRate: parseFloat(exchangeRate.toFixed(6)),
      convertedAmount,
      status: 'completed',
      idempotencyKey,
      createdAt: now,
      completedAt: now,
    };

    // Update balances
    const newSourceBalance = parseFloat((sourceAccount.balance - amount).toFixed(2));
    const newDestBalance = parseFloat((destAccount.balance + convertedAmount).toFixed(2));

    accountStore.update(sourceAccountId, {
      ...sourceAccount,
      balance: newSourceBalance,
      updatedAt: now,
    });

    accountStore.update(destinationAccountId, {
      ...destAccount,
      balance: newDestBalance,
      updatedAt: now,
    });

    // Create transactions
    const outTransaction: Transaction = {
      id: uuid(),
      accountId: sourceAccountId,
      type: 'transfer_out',
      amount,
      currency: sourceAccount.currency,
      description: description || `Transfer to ${destAccount.name}`,
      balanceAfter: newSourceBalance,
      relatedTransferId: transferId,
      createdAt: now,
    };

    const inTransaction: Transaction = {
      id: uuid(),
      accountId: destinationAccountId,
      type: 'transfer_in',
      amount: convertedAmount,
      currency: destAccount.currency,
      description: description || `Transfer from ${sourceAccount.name}`,
      balanceAfter: newDestBalance,
      relatedTransferId: transferId,
      createdAt: now,
    };

    transactionStore.create(outTransaction);
    transactionStore.create(inTransaction);
    transferStore.create(transfer);

    res.status(201).json({ data: transfer });
  }
);

export default router;

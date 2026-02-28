import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { accountStore, transactionStore } from '../store/seed';
import { NotFoundError, BusinessRuleError } from '../models/errors';
import { validate, required, isOneOf, isPositiveNumber } from '../middleware/validate';
import { parsePagination, paginate } from '../utils/pagination';
import { parseSort, sortItems, parseDateRange } from '../utils/filters';
import { Transaction } from '../models/types';

const router = Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         accountId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [deposit, withdrawal, transfer_in, transfer_out, fee]
 *         amount:
 *           type: number
 *           example: 1500.00
 *         currency:
 *           type: string
 *           example: USD
 *         description:
 *           type: string
 *           example: Salary deposit
 *         balanceAfter:
 *           type: number
 *           example: 6500.00
 *         relatedTransferId:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreateTransaction:
 *       type: object
 *       required: [type, amount]
 *       properties:
 *         type:
 *           type: string
 *           enum: [deposit, withdrawal]
 *           example: deposit
 *           description: Only deposit and withdrawal can be created manually. Other types are system-generated.
 *         amount:
 *           type: number
 *           example: 500.00
 *         description:
 *           type: string
 *           example: Monthly savings deposit
 */

/**
 * @swagger
 * /accounts/{accountId}/transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: List transactions for an account
 *     description: Returns a paginated list of transactions for a specific account. Supports filtering by type, date range, and sorting.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *         example: acc-001
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [deposit, withdrawal, transfer_in, transfer_out, fee]
 *         description: Filter by transaction type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions from this date (inclusive)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter transactions until this date (inclusive)
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [amount, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
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
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *       404:
 *         description: Account not found
 */
router.get('/', (req: Request, res: Response) => {
  const { accountId } = req.params;
  const account = accountStore.getById(accountId);
  if (!account) throw new NotFoundError('Account', accountId);

  let transactions = transactionStore.filter((t) => t.accountId === accountId);

  // Filter by type
  const type = req.query.type as string;
  if (type) transactions = transactions.filter((t) => t.type === type);

  // Filter by date range
  const { from, to } = parseDateRange(req);
  if (from) transactions = transactions.filter((t) => new Date(t.createdAt) >= from);
  if (to) transactions = transactions.filter((t) => new Date(t.createdAt) <= to);

  // Sort
  const sort = parseSort(req, ['amount', 'createdAt']);
  transactions = sortItems(transactions, sort);

  // Paginate
  const pagination = parsePagination(req);
  const { items, total } = paginate(transactions, pagination);

  res.setHeader('X-Total-Count', total);
  res.json({
    data: items,
    meta: { total, limit: pagination.limit, offset: pagination.offset },
  });
});

/**
 * @swagger
 * /accounts/{accountId}/transactions/{transactionId}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a specific transaction
 *     description: Returns a single transaction by ID for a given account.
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Account or transaction not found
 */
router.get('/:transactionId', (req: Request, res: Response) => {
  const { accountId, transactionId } = req.params;
  const account = accountStore.getById(accountId);
  if (!account) throw new NotFoundError('Account', accountId);

  const transaction = transactionStore.getById(transactionId);
  if (!transaction || transaction.accountId !== accountId) {
    throw new NotFoundError('Transaction', transactionId);
  }

  res.json({ data: transaction });
});

/**
 * @swagger
 * /accounts/{accountId}/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Create a transaction (deposit or withdrawal)
 *     description: |
 *       Creates a deposit or withdrawal transaction for an account.
 *
 *       **Business rules:**
 *       - Account must be active (not frozen or closed)
 *       - Withdrawal cannot exceed balance (unless account type is 'credit')
 *       - Only 'deposit' and 'withdrawal' types can be created manually
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         example: acc-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTransaction'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Account not found
 *       422:
 *         description: Business rule violation (e.g. insufficient funds, account frozen)
 */
router.post(
  '/',
  validate(
    required('type', 'amount'),
    isOneOf('type', ['deposit', 'withdrawal']),
    isPositiveNumber('amount')
  ),
  (req: Request, res: Response) => {
    const { accountId } = req.params;
    const account = accountStore.getById(accountId);
    if (!account) throw new NotFoundError('Account', accountId);

    if (account.status === 'frozen') {
      throw new BusinessRuleError('ACCOUNT_FROZEN', 'Cannot create transactions on a frozen account');
    }
    if (account.status === 'closed') {
      throw new BusinessRuleError('ACCOUNT_CLOSED', 'Cannot create transactions on a closed account');
    }

    const { type, amount, description } = req.body;

    if (type === 'withdrawal' && account.type !== 'credit' && account.balance < amount) {
      throw new BusinessRuleError('INSUFFICIENT_FUNDS', 'Insufficient funds for this withdrawal', {
        available: account.balance,
        requested: amount,
      });
    }

    const newBalance = type === 'deposit'
      ? account.balance + amount
      : account.balance - amount;

    const transaction: Transaction = {
      id: uuid(),
      accountId,
      type,
      amount,
      currency: account.currency,
      description: description || `${type === 'deposit' ? 'Deposit' : 'Withdrawal'}`,
      balanceAfter: parseFloat(newBalance.toFixed(2)),
      createdAt: new Date().toISOString(),
    };

    // Update account balance
    accountStore.update(accountId, {
      ...account,
      balance: transaction.balanceAfter,
      updatedAt: new Date().toISOString(),
    });

    transactionStore.create(transaction);
    res.status(201).json({ data: transaction });
  }
);

export default router;

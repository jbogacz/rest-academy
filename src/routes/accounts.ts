import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { accountStore, currencyStore } from '../store/seed';
import { NotFoundError, ValidationError, BusinessRuleError } from '../models/errors';
import { validate, required, isOneOf, isString } from '../middleware/validate';
import { parsePagination, paginate } from '../utils/pagination';
import { parseSort, sortItems } from '../utils/filters';
import { Account } from '../models/types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: acc-001
 *         name:
 *           type: string
 *           example: Main Checking
 *         ownerName:
 *           type: string
 *           example: Alice Johnson
 *         currency:
 *           type: string
 *           example: USD
 *         balance:
 *           type: number
 *           example: 5420.50
 *         type:
 *           type: string
 *           enum: [checking, savings, credit]
 *           example: checking
 *         status:
 *           type: string
 *           enum: [active, frozen, closed]
 *           example: active
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateAccount:
 *       type: object
 *       required: [name, ownerName, currency, type]
 *       properties:
 *         name:
 *           type: string
 *           example: My New Account
 *         ownerName:
 *           type: string
 *           example: John Doe
 *         currency:
 *           type: string
 *           example: USD
 *         type:
 *           type: string
 *           enum: [checking, savings, credit]
 *           example: checking
 *         initialBalance:
 *           type: number
 *           example: 1000
 *           description: Optional initial deposit amount
 *     UpdateAccount:
 *       type: object
 *       required: [name, ownerName, currency, type]
 *       properties:
 *         name:
 *           type: string
 *           example: Updated Account Name
 *         ownerName:
 *           type: string
 *           example: John Doe
 *         currency:
 *           type: string
 *           example: USD
 *         type:
 *           type: string
 *           enum: [checking, savings, credit]
 *           example: checking
 *     PatchAccount:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: New Account Name
 *         ownerName:
 *           type: string
 *           example: Jane Doe
 *         status:
 *           type: string
 *           enum: [active, frozen, closed]
 *           example: frozen
 */

/**
 * @swagger
 * /accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: List all accounts
 *     description: Returns a paginated list of accounts. Supports filtering by status, currency, type and owner. Supports sorting by balance, name, or createdAt.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, frozen, closed]
 *         description: Filter by account status
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Filter by currency code
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [checking, savings, credit]
 *         description: Filter by account type
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filter by owner name (partial match)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [balance, name, createdAt]
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of items to skip
 *     responses:
 *       200:
 *         description: Paginated list of accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
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
  let accounts = accountStore.getAll();

  // Filters
  const status = req.query.status as string;
  if (status) accounts = accounts.filter((a) => a.status === status);

  const currency = req.query.currency as string;
  if (currency) accounts = accounts.filter((a) => a.currency === currency.toUpperCase());

  const type = req.query.type as string;
  if (type) accounts = accounts.filter((a) => a.type === type);

  const owner = req.query.owner as string;
  if (owner) accounts = accounts.filter((a) => a.ownerName.toLowerCase().includes(owner.toLowerCase()));

  // Sort
  const sort = parseSort(req, ['balance', 'name', 'createdAt']);
  accounts = sortItems(accounts, sort);

  // Paginate
  const pagination = parsePagination(req);
  const { items, total } = paginate(accounts, pagination);

  res.setHeader('X-Total-Count', total);
  res.json({
    data: items,
    meta: { total, limit: pagination.limit, offset: pagination.offset },
  });
});

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get account by ID
 *     description: Returns a single account by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *         example: acc-001
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 */
router.get('/:id', (req: Request, res: Response) => {
  const account = accountStore.getById(req.params.id);
  if (!account) throw new NotFoundError('Account', req.params.id);
  res.json({ data: account });
});

/**
 * @swagger
 * /accounts:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     description: Creates a new bank account. Optionally set an initial balance.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAccount'
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  validate(
    required('name', 'ownerName', 'currency', 'type'),
    isOneOf('type', ['checking', 'savings', 'credit']),
    isString('name'),
    isString('ownerName')
  ),
  (req: Request, res: Response) => {
    const { name, ownerName, currency, type, initialBalance } = req.body;

    const currencyCode = currency.toUpperCase();
    if (!currencyStore.has(currencyCode)) {
      throw new ValidationError(`Currency '${currency}' is not supported`);
    }

    if (initialBalance !== undefined && (typeof initialBalance !== 'number' || initialBalance < 0)) {
      throw new ValidationError('initialBalance must be a non-negative number');
    }

    const now = new Date().toISOString();
    const account: Account = {
      id: uuid(),
      name,
      ownerName,
      currency: currencyCode,
      balance: initialBalance || 0,
      type,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    accountStore.create(account);
    res.status(201).json({ data: account });
  }
);

/**
 * @swagger
 * /accounts/{id}:
 *   put:
 *     tags: [Accounts]
 *     summary: Update an account (full replace)
 *     description: Replaces all account fields. All required fields must be provided. Does not change balance or status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAccount'
 *     responses:
 *       200:
 *         description: Account updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *       400:
 *         description: Validation error
 */
router.put(
  '/:id',
  validate(
    required('name', 'ownerName', 'currency', 'type'),
    isOneOf('type', ['checking', 'savings', 'credit'])
  ),
  (req: Request, res: Response) => {
    const account = accountStore.getById(req.params.id);
    if (!account) throw new NotFoundError('Account', req.params.id);

    if (account.status === 'closed') {
      throw new BusinessRuleError('ACCOUNT_CLOSED', 'Cannot modify a closed account');
    }

    const { name, ownerName, currency, type } = req.body;
    const currencyCode = currency.toUpperCase();
    if (!currencyStore.has(currencyCode)) {
      throw new ValidationError(`Currency '${currency}' is not supported`);
    }

    const updated: Account = {
      ...account,
      name,
      ownerName,
      currency: currencyCode,
      type,
      updatedAt: new Date().toISOString(),
    };

    accountStore.update(req.params.id, updated);
    res.json({ data: updated });
  }
);

/**
 * @swagger
 * /accounts/{id}:
 *   patch:
 *     tags: [Accounts]
 *     summary: Partially update an account
 *     description: Updates only the provided fields. Can be used to change name, owner, or status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PatchAccount'
 *     responses:
 *       200:
 *         description: Account updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *       422:
 *         description: Business rule violation
 */
router.patch('/:id', (req: Request, res: Response) => {
  const account = accountStore.getById(req.params.id);
  if (!account) throw new NotFoundError('Account', req.params.id);

  if (account.status === 'closed') {
    throw new BusinessRuleError('ACCOUNT_CLOSED', 'Cannot modify a closed account');
  }

  const { name, ownerName, status } = req.body;

  if (status !== undefined) {
    const validStatuses = ['active', 'frozen', 'closed'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
    }
    // Can't reopen a frozen account directly to active if it was closed
    if (account.status === 'frozen' && status === 'closed') {
      // OK - can close a frozen account
    } else if (account.status === 'frozen' && status === 'active') {
      // OK - can unfreeze
    }
  }

  const updated: Account = {
    ...account,
    ...(name !== undefined && { name }),
    ...(ownerName !== undefined && { ownerName }),
    ...(status !== undefined && { status }),
    updatedAt: new Date().toISOString(),
  };

  accountStore.update(req.params.id, updated);
  res.json({ data: updated });
});

/**
 * @swagger
 * /accounts/{id}:
 *   delete:
 *     tags: [Accounts]
 *     summary: Delete an account
 *     description: Deletes an account. Account must have zero balance to be deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Account ID
 *     responses:
 *       204:
 *         description: Account deleted successfully
 *       404:
 *         description: Account not found
 *       422:
 *         description: Account has non-zero balance
 */
router.delete('/:id', (req: Request, res: Response) => {
  const account = accountStore.getById(req.params.id);
  if (!account) throw new NotFoundError('Account', req.params.id);

  if (account.balance !== 0) {
    throw new BusinessRuleError(
      'NON_ZERO_BALANCE',
      'Cannot delete an account with non-zero balance. Withdraw or transfer funds first.',
      { balance: account.balance }
    );
  }

  accountStore.delete(req.params.id);
  res.status(204).send();
});

export default router;

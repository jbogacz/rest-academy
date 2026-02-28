import { Router, Request, Response } from 'express';
import { accountStore, transactionStore } from '../store/seed';
import { NotFoundError } from '../models/errors';
import { parseDateRange } from '../utils/filters';
import { ReportAccountSummary } from '../models/types';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AccountSummary:
 *       type: object
 *       properties:
 *         accountId:
 *           type: string
 *         accountName:
 *           type: string
 *         currency:
 *           type: string
 *         balance:
 *           type: number
 *         totalDeposits:
 *           type: number
 *         totalWithdrawals:
 *           type: number
 *         totalTransferIn:
 *           type: number
 *         totalTransferOut:
 *           type: number
 *         totalFees:
 *           type: number
 *         transactionCount:
 *           type: integer
 *     TransactionSummary:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           example: "2024-03"
 *         totalIn:
 *           type: number
 *         totalOut:
 *           type: number
 *         net:
 *           type: number
 *         transactionCount:
 *           type: integer
 */

/**
 * @swagger
 * /reports/account-summary:
 *   get:
 *     tags: [Reports]
 *     summary: Get account summary report
 *     description: |
 *       Returns a financial summary for all accounts or a specific account.
 *       Shows totals for each transaction type and the transaction count.
 *       Supports date range filtering to scope the summary period.
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Optional account ID to get summary for a specific account
 *         example: acc-001
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for the report period
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for the report period
 *         example: "2024-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Account summary report
 *         headers:
 *           X-Report-Generated-At:
 *             schema:
 *               type: string
 *               format: date-time
 *             description: Timestamp when the report was generated
 *           X-Report-Period:
 *             schema:
 *               type: string
 *             description: The date range covered by the report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AccountSummary'
 *       404:
 *         description: Account not found
 */
router.get('/account-summary', (req: Request, res: Response) => {
  const accountId = req.query.accountId as string;
  const { from, to } = parseDateRange(req);

  let accounts = accountStore.getAll();
  if (accountId) {
    const account = accountStore.getById(accountId);
    if (!account) throw new NotFoundError('Account', accountId);
    accounts = [account];
  }

  const summaries: ReportAccountSummary[] = accounts.map((account) => {
    let transactions = transactionStore.filter((t) => t.accountId === account.id);

    if (from) transactions = transactions.filter((t) => new Date(t.createdAt) >= from);
    if (to) transactions = transactions.filter((t) => new Date(t.createdAt) <= to);

    return {
      accountId: account.id,
      accountName: account.name,
      currency: account.currency,
      balance: account.balance,
      totalDeposits: sum(transactions, 'deposit'),
      totalWithdrawals: sum(transactions, 'withdrawal'),
      totalTransferIn: sum(transactions, 'transfer_in'),
      totalTransferOut: sum(transactions, 'transfer_out'),
      totalFees: sum(transactions, 'fee'),
      transactionCount: transactions.length,
    };
  });

  const periodStr = [
    from ? from.toISOString() : 'beginning',
    to ? to.toISOString() : 'now',
  ].join(' to ');

  res.setHeader('X-Report-Generated-At', new Date().toISOString());
  res.setHeader('X-Report-Period', periodStr);
  res.json({ data: summaries });
});

/**
 * @swagger
 * /reports/transactions:
 *   get:
 *     tags: [Reports]
 *     summary: Get transaction summary by period
 *     description: |
 *       Returns transaction totals grouped by month (or custom period).
 *       Useful for seeing cash flow trends over time.
 *     parameters:
 *       - in: query
 *         name: accountId
 *         schema:
 *           type: string
 *         description: Optional account ID
 *         example: acc-001
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2024-12-31T23:59:59Z"
 *     responses:
 *       200:
 *         description: Monthly transaction summary
 *         headers:
 *           X-Report-Generated-At:
 *             schema:
 *               type: string
 *               format: date-time
 *           X-Total-Count:
 *             schema:
 *               type: integer
 *             description: Number of periods in the report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TransactionSummary'
 */
router.get('/transactions', (req: Request, res: Response) => {
  const accountId = req.query.accountId as string;
  const { from, to } = parseDateRange(req);

  let transactions = transactionStore.getAll();

  if (accountId) transactions = transactions.filter((t) => t.accountId === accountId);
  if (from) transactions = transactions.filter((t) => new Date(t.createdAt) >= from);
  if (to) transactions = transactions.filter((t) => new Date(t.createdAt) <= to);

  // Group by month
  const months = new Map<string, { totalIn: number; totalOut: number; count: number }>();

  transactions.forEach((t) => {
    const period = t.createdAt.substring(0, 7); // YYYY-MM
    const entry = months.get(period) || { totalIn: 0, totalOut: 0, count: 0 };

    if (t.type === 'deposit' || t.type === 'transfer_in') {
      entry.totalIn += t.amount;
    } else {
      entry.totalOut += t.amount;
    }
    entry.count++;
    months.set(period, entry);
  });

  const summaries = Array.from(months.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      totalIn: parseFloat(data.totalIn.toFixed(2)),
      totalOut: parseFloat(data.totalOut.toFixed(2)),
      net: parseFloat((data.totalIn - data.totalOut).toFixed(2)),
      transactionCount: data.count,
    }));

  res.setHeader('X-Report-Generated-At', new Date().toISOString());
  res.setHeader('X-Total-Count', summaries.length);
  res.json({ data: summaries });
});

function sum(transactions: { type: string; amount: number }[], type: string): number {
  return parseFloat(
    transactions
      .filter((t) => t.type === type)
      .reduce((acc, t) => acc + t.amount, 0)
      .toFixed(2)
  );
}

export default router;

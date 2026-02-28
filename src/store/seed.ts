import { v4 as uuid } from 'uuid';
import { Store, KeyValueStore } from './index';
import { Account, Currency, Transaction, Transfer } from '../models/types';

export const currencyStore = new KeyValueStore<Currency>();
export const accountStore = new Store<Account>();
export const transactionStore = new Store<Transaction>();
export const transferStore = new Store<Transfer>();

export function seedData(): void {
  currencyStore.clear();
  accountStore.clear();
  transactionStore.clear();
  transferStore.clear();

  // Currencies
  const currencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat', decimalPlaces: 2, exchangeRateToUSD: 1.0 },
    { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', decimalPlaces: 2, exchangeRateToUSD: 1.08 },
    { code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat', decimalPlaces: 2, exchangeRateToUSD: 1.27 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', type: 'fiat', decimalPlaces: 0, exchangeRateToUSD: 0.0067 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', type: 'fiat', decimalPlaces: 2, exchangeRateToUSD: 1.13 },
    { code: 'PLN', name: 'Polish Zloty', symbol: 'zl', type: 'fiat', decimalPlaces: 2, exchangeRateToUSD: 0.25 },
    { code: 'BTC', name: 'Bitcoin', symbol: 'BTC', type: 'crypto', decimalPlaces: 8, exchangeRateToUSD: 67000.0 },
    { code: 'ETH', name: 'Ethereum', symbol: 'ETH', type: 'crypto', decimalPlaces: 8, exchangeRateToUSD: 3500.0 },
  ];

  currencies.forEach((c) => currencyStore.set(c.code, c));

  // Accounts
  const now = new Date().toISOString();
  const accounts: Account[] = [
    {
      id: 'acc-001',
      name: 'Main Checking',
      ownerName: 'Alice Johnson',
      currency: 'USD',
      balance: 5420.50,
      type: 'checking',
      status: 'active',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: now,
    },
    {
      id: 'acc-002',
      name: 'Euro Savings',
      ownerName: 'Alice Johnson',
      currency: 'EUR',
      balance: 12350.00,
      type: 'savings',
      status: 'active',
      createdAt: '2024-02-01T09:30:00Z',
      updatedAt: now,
    },
    {
      id: 'acc-003',
      name: 'Business Account',
      ownerName: 'Bob Smith',
      currency: 'USD',
      balance: 89200.75,
      type: 'checking',
      status: 'active',
      createdAt: '2024-01-20T14:00:00Z',
      updatedAt: now,
    },
    {
      id: 'acc-004',
      name: 'Travel Fund',
      ownerName: 'Carol Davis',
      currency: 'GBP',
      balance: 3100.00,
      type: 'savings',
      status: 'active',
      createdAt: '2024-03-10T11:00:00Z',
      updatedAt: now,
    },
    {
      id: 'acc-005',
      name: 'Old Account',
      ownerName: 'Dave Wilson',
      currency: 'USD',
      balance: 0,
      type: 'checking',
      status: 'frozen',
      createdAt: '2023-06-01T08:00:00Z',
      updatedAt: now,
    },
    {
      id: 'acc-006',
      name: 'Credit Line',
      ownerName: 'Alice Johnson',
      currency: 'USD',
      balance: -1500.00,
      type: 'credit',
      status: 'active',
      createdAt: '2024-04-01T12:00:00Z',
      updatedAt: now,
    },
  ];

  accounts.forEach((a) => accountStore.create(a));

  // Transactions
  const transactions: Transaction[] = [
    {
      id: uuid(),
      accountId: 'acc-001',
      type: 'deposit',
      amount: 3000.00,
      currency: 'USD',
      description: 'Salary deposit - January',
      balanceAfter: 3000.00,
      createdAt: '2024-01-16T09:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-001',
      type: 'deposit',
      amount: 3000.00,
      currency: 'USD',
      description: 'Salary deposit - February',
      balanceAfter: 6000.00,
      createdAt: '2024-02-16T09:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-001',
      type: 'withdrawal',
      amount: 450.00,
      currency: 'USD',
      description: 'Rent payment',
      balanceAfter: 5550.00,
      createdAt: '2024-02-20T10:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-001',
      type: 'fee',
      amount: 29.50,
      currency: 'USD',
      description: 'Monthly service fee',
      balanceAfter: 5520.50,
      createdAt: '2024-02-28T23:59:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-001',
      type: 'withdrawal',
      amount: 100.00,
      currency: 'USD',
      description: 'ATM withdrawal',
      balanceAfter: 5420.50,
      createdAt: '2024-03-05T14:30:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-002',
      type: 'deposit',
      amount: 10000.00,
      currency: 'EUR',
      description: 'Initial deposit',
      balanceAfter: 10000.00,
      createdAt: '2024-02-01T10:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-002',
      type: 'deposit',
      amount: 2500.00,
      currency: 'EUR',
      description: 'Monthly savings',
      balanceAfter: 12500.00,
      createdAt: '2024-03-01T10:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-002',
      type: 'fee',
      amount: 150.00,
      currency: 'EUR',
      description: 'Account maintenance fee',
      balanceAfter: 12350.00,
      createdAt: '2024-03-31T23:59:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-003',
      type: 'deposit',
      amount: 50000.00,
      currency: 'USD',
      description: 'Client payment - Project Alpha',
      balanceAfter: 50000.00,
      createdAt: '2024-01-25T16:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-003',
      type: 'deposit',
      amount: 42000.00,
      currency: 'USD',
      description: 'Client payment - Project Beta',
      balanceAfter: 92000.00,
      createdAt: '2024-02-15T11:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-003',
      type: 'withdrawal',
      amount: 2500.00,
      currency: 'USD',
      description: 'Office supplies',
      balanceAfter: 89500.00,
      createdAt: '2024-03-01T09:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-003',
      type: 'fee',
      amount: 299.25,
      currency: 'USD',
      description: 'Wire transfer fee',
      balanceAfter: 89200.75,
      createdAt: '2024-03-02T10:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-004',
      type: 'deposit',
      amount: 5000.00,
      currency: 'GBP',
      description: 'Holiday fund - initial',
      balanceAfter: 5000.00,
      createdAt: '2024-03-10T12:00:00Z',
    },
    {
      id: uuid(),
      accountId: 'acc-004',
      type: 'withdrawal',
      amount: 1900.00,
      currency: 'GBP',
      description: 'Flight booking - Paris',
      balanceAfter: 3100.00,
      createdAt: '2024-03-20T15:00:00Z',
    },
  ];

  transactions.forEach((t) => transactionStore.create(t));
}

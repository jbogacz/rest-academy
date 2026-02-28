export interface Currency {
  code: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto';
  decimalPlaces: number;
  exchangeRateToUSD: number;
}

export type AccountStatus = 'active' | 'frozen' | 'closed';
export type AccountType = 'checking' | 'savings' | 'credit';

export interface Account {
  id: string;
  name: string;
  ownerName: string;
  currency: string;
  balance: number;
  type: AccountType;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountBody {
  name: string;
  ownerName: string;
  currency: string;
  type: AccountType;
  initialBalance?: number;
}

export interface UpdateAccountBody {
  name: string;
  ownerName: string;
  currency: string;
  type: AccountType;
}

export interface PatchAccountBody {
  name?: string;
  ownerName?: string;
  status?: AccountStatus;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'fee';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  balanceAfter: number;
  relatedTransferId?: string;
  createdAt: string;
}

export interface CreateTransactionBody {
  type: 'deposit' | 'withdrawal';
  amount: number;
  description?: string;
}

export type TransferStatus = 'pending' | 'completed' | 'failed';

export interface Transfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  sourceCurrency: string;
  destinationCurrency: string;
  exchangeRate: number;
  convertedAmount: number;
  status: TransferStatus;
  failureReason?: string;
  idempotencyKey?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateTransferBody {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
}

export interface LessonModule {
  id: number;
  title: string;
  description: string;
}

export type VerificationType = 'state' | 'quiz' | 'exploration';

export interface Lesson {
  id: number;
  moduleId: number;
  title: string;
  description: string;
  task: string;
  hint: string;
  verificationType: VerificationType;
  expectedAnswer?: string | number;
  expectedEndpoint?: string;
  expectedMethod?: string;
}

export interface LessonProgress {
  lessonId: number;
  completed: boolean;
  completedAt?: string;
  attempts: number;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ReportAccountSummary {
  accountId: string;
  accountName: string;
  currency: string;
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalFees: number;
  transactionCount: number;
}

export interface ReportTransactionSummary {
  period: string;
  totalIn: number;
  totalOut: number;
  net: number;
  transactionCount: number;
}

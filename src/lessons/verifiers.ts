import { lessons } from './registry';
import { accountStore, transactionStore, transferStore } from '../store/seed';
import { hasHitEndpoint } from '../middleware/request-tracker';
import { NotFoundError } from '../models/errors';

export interface VerificationResult {
  lessonId: number;
  passed: boolean;
  message: string;
}

export function verifyLesson(lessonId: number, answer?: string): VerificationResult {
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) throw new NotFoundError('Lesson', String(lessonId));

  switch (lesson.verificationType) {
    case 'quiz':
      return verifyQuiz(lesson.id, lesson.expectedAnswer as string, answer);
    case 'exploration':
      return verifyExploration(lesson.id, lesson.expectedMethod!, lesson.expectedEndpoint!);
    case 'state':
      return verifyState(lesson.id);
    default:
      return { lessonId, passed: false, message: 'Unknown verification type' };
  }
}

function verifyQuiz(lessonId: number, expected: string, answer?: string): VerificationResult {
  if (!answer) {
    return {
      lessonId,
      passed: false,
      message: 'Please provide an answer in the request body: {"answer": "your answer"}',
    };
  }

  const normalizedAnswer = String(answer).trim().toLowerCase();
  const normalizedExpected = String(expected).trim().toLowerCase();

  if (normalizedAnswer === normalizedExpected) {
    return { lessonId, passed: true, message: 'Correct! Well done.' };
  }

  return {
    lessonId,
    passed: false,
    message: `Not quite. Try again! Your answer: "${answer}"`,
  };
}

function verifyExploration(lessonId: number, method: string, endpoint: string): VerificationResult {
  const hit = hasHitEndpoint(method, endpoint);

  if (hit) {
    return {
      lessonId,
      passed: true,
      message: `Great! You\'ve successfully made a ${method} request to the expected endpoint.`,
    };
  }

  return {
    lessonId,
    passed: false,
    message: `You haven't made the expected ${method} request yet. Try the endpoint described in the task.`,
  };
}

function verifyState(lessonId: number): VerificationResult {
  switch (lessonId) {
    case 6: {
      // Check if any account was created beyond the seeded ones
      const accounts = accountStore.getAll();
      const nonSeeded = accounts.filter((a) => !a.id.startsWith('acc-'));
      if (nonSeeded.length > 0) {
        return { lessonId, passed: true, message: 'Account created successfully! Check its ID and details.' };
      }
      return { lessonId, passed: false, message: 'No new accounts found. Create one using POST /accounts.' };
    }

    case 12: {
      // Check if a deposit was made to acc-001
      const transactions = transactionStore.filter(
        (t) => t.accountId === 'acc-001' && t.type === 'deposit'
      );
      // Seed data has 2 deposits for acc-001
      if (transactions.length > 2) {
        return { lessonId, passed: true, message: 'Deposit recorded! Check the transaction and updated account balance.' };
      }
      return { lessonId, passed: false, message: 'No new deposit found on acc-001. POST to /accounts/acc-001/transactions.' };
    }

    case 16: {
      // Check if any transfer exists
      const transfers = transferStore.getAll();
      if (transfers.length > 0) {
        return { lessonId, passed: true, message: 'Transfer completed! Check both accounts\' balances and transactions.' };
      }
      return { lessonId, passed: false, message: 'No transfers found. POST to /transfers.' };
    }

    case 19: {
      // Check if a cross-currency transfer exists
      const crossCurrency = transferStore.filter((t) => t.sourceCurrency !== t.destinationCurrency);
      if (crossCurrency.length > 0) {
        return {
          lessonId,
          passed: true,
          message: `Cross-currency transfer completed! Exchange rate: ${crossCurrency[0].exchangeRate}, converted: ${crossCurrency[0].convertedAmount} ${crossCurrency[0].destinationCurrency}`,
        };
      }
      return { lessonId, passed: false, message: 'No cross-currency transfers found. Transfer between accounts with different currencies.' };
    }

    default:
      return { lessonId, passed: false, message: 'State verification not implemented for this lesson.' };
  }
}

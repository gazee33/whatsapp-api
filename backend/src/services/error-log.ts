import { prisma } from '../lib/prisma.js';

export interface ErrorLogParams {
  businessId: string;
  customerId?: string;
  sessionId?: string;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, any>;
}

export async function logError(params: ErrorLogParams): Promise<void> {
  const { businessId, customerId, sessionId, errorType, errorMessage, errorStack, context } = params;

  // Log to console with full details
  console.error('\n' + '='.repeat(60));
  console.error('🔴 ERROR LOGGED');
  console.error('='.repeat(60));
  console.error(`📅 Timestamp: ${new Date().toISOString()}`);
  console.error(`👤 Customer ID: ${customerId}`);
  console.error(`🏪 Business ID: ${businessId}`);
  if (sessionId) console.error(`🔖 Session ID: ${sessionId}`);
  console.error(`❌ Error Type: ${errorType}`);
  console.error(`📝 Error Message: ${errorMessage}`);
  if (errorStack) {
    console.error('-'.repeat(60));
    console.error('Stack Trace:');
    console.error(errorStack);
  }
  if (context) {
    console.error('-'.repeat(60));
    console.error('Context:', JSON.stringify(context, null, 2));
  }
  console.error('='.repeat(60) + '\n');

  // Store in database for later retrieval
  try {
    await prisma.errorLog.create({
      data: {
        businessId,
        customerId,
        sessionId: sessionId || null,
        errorType,
        errorMessage,
        errorStack: errorStack || null,
        context: context ? JSON.stringify(context) : null,
      },
    });
  } catch (dbError) {
    // If database logging fails, at least we have console output
    console.error('Failed to persist error to database:', dbError);
  }
}

export async function getErrorLogs(
  businessId: string,
  limit: number = 50
): Promise<any[]> {
  return prisma.errorLog.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getErrorLogsByCustomer(
  businessId: string,
  customerId: string,
  limit: number = 20
): Promise<any[]> {
  return prisma.errorLog.findMany({
    where: { businessId, customerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function clearErrorLogs(businessId: string): Promise<void> {
  await prisma.errorLog.deleteMany({
    where: { businessId },
  });
}
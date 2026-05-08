import { config } from '../config.js';

const BASE_URL = config.dualhookApiBase;

interface DualhookHeaders {
  Authorization: string;
  'Content-Type': string;
  'Idempotency-Key'?: string;
}

function headers(idempotencyKey?: string): DualhookHeaders {
  const h: DualhookHeaders = {
    Authorization: `Bearer ${config.dualhookApiKey}`,
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    h['Idempotency-Key'] = idempotencyKey;
  }
  return h;
}

class DualhookApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'DualhookApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: headers(idempotencyKey) as unknown as Record<string, string>,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (!response.ok) {
    const err = (data?.error || {}) as { code?: string; message?: string };
    throw new DualhookApiError(
      response.status,
      err.code || 'unknown',
      err.message || `Dualhook API error ${response.status}`
    );
  }

  return data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateSessionParams {
  tenantId: string;
  tenantName: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  cancelRedirectUrl: string;
  webhookOverrideUrl: string;
  webhookVerifyToken: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionResponse {
  sessionId: string;
  onboardingUrl: string;
  expiresAt: string;
  idempotencyExpiresAt: string;
}

export interface DualhookConnectionData {
  connectionId: string;
  name: string;
  wabaId: string;
  phoneNumberId: string;
  webhookUrl: string;
  status: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  connectionMode?: string;
  coexistenceStatus?: string;
  heartbeatApplies?: boolean;
  heartbeatStatus?: string;
  heartbeatLastConfirmedAt?: string;
  heartbeatNextDueAt?: string;
  heartbeatReminderSentAt?: string;
  createdAt?: string;
  updatedAt?: string;
  billingSuspendedAt?: string;
}

export interface ConnectionListResponse {
  data: DualhookConnectionData[];
  nextCursor: string | null;
}

export interface RevealSecretsResponse {
  connectionId: string;
  secrets: {
    access_token: string;
  };
}

export interface HealthSnapshot {
  healthStatus: string;
  qualityRating: string;
  accountMode: string | null;
  messagingTier: string;
  nameStatus: string;
  newNameStatus: string | null;
  additionalInfo: string | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface ConnectionHealthResponse {
  connectionId: string;
  health: HealthSnapshot | null;
}

export interface HeartbeatConfirmResponse {
  connectionId: string;
  heartbeatStatus: string;
  heartbeatLastConfirmedAt: string;
  heartbeatNextDueAt: string;
}

export interface DisconnectResponse {
  connectionId: string;
  status: string;
}

// ─── Onboarding Sessions ─────────────────────────────────────────────────────

export async function createOnboardingSession(
  params: CreateSessionParams
): Promise<CreateSessionResponse> {
  return request<CreateSessionResponse>(
    'POST',
    '/onboarding/sessions',
    params,
    crypto.randomUUID()
  );
}

export async function getOnboardingSession(
  sessionId: string
): Promise<{ sessionId: string; status: string; connectionId?: string; expiresAt: string }> {
  return request('GET', `/onboarding/sessions/${sessionId}`);
}

// ─── Connections ─────────────────────────────────────────────────────────────

export async function listConnections(
  tenantId?: string,
  limit?: number
): Promise<ConnectionListResponse> {
  const params = new URLSearchParams();
  if (tenantId) params.set('tenantId', tenantId);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  return request('GET', `/connections${qs ? `?${qs}` : ''}`);
}

export async function getConnection(
  connectionId: string
): Promise<DualhookConnectionData> {
  return request('GET', `/connections/${connectionId}`);
}

export async function updateWebhook(
  connectionId: string,
  webhookUrl: string,
  webhookVerifyToken: string
): Promise<{ connectionId: string; wabaId: string; webhookUrl: string; affectedConnectionIds: string[] }> {
  return request('PATCH', `/connections/${connectionId}`, {
    webhookUrl,
    webhookVerifyToken,
  });
}

export async function disconnectConnection(
  connectionId: string
): Promise<DisconnectResponse> {
  return request('DELETE', `/connections/${connectionId}`);
}

export async function confirmHeartbeat(
  connectionId: string
): Promise<HeartbeatConfirmResponse> {
  return request(
    'POST',
    `/connections/${connectionId}/heartbeat/confirm`,
    {},
    crypto.randomUUID()
  );
}

// ─── Secrets ─────────────────────────────────────────────────────────────────

export async function revealSecrets(
  connectionId: string
): Promise<RevealSecretsResponse> {
  return request('POST', `/connections/${connectionId}/reveal-secrets`, {
    secretTypes: ['access_token'],
  });
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function getConnectionHealth(
  connectionId: string
): Promise<ConnectionHealthResponse> {
  return request('GET', `/connections/${connectionId}/health`);
}

export async function refreshConnectionHealth(
  connectionId: string
): Promise<{ connectionId: string; refreshed: boolean }> {
  return request('POST', `/connections/${connectionId}/health/refresh`);
}

export { DualhookApiError };

// Meta webhook payload types
export interface MetaWebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: {
    profile: { name: string };
    wa_id: string;
  }[];
  messages?: WebhookMessage[];
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

// Business with settings
export interface BusinessWithSettings {
  id: string;
  name: string;
  whatsappPhoneNumberId?: string;
  whatsappPhoneNumber?: string;
  apiKey: string;
  settings?: {
    name: string;
    currency: string;
    openingTime: string;
    closingTime: string;
    welcomeMsg: string;
    aiRules: string;
  };
}

// Order status enum
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered';

// Extend Express Request for IAM
import { Request } from 'express';

export interface AuthRequest extends Request {
  business?: BusinessWithSettings;
  user?: {
    id: string;
    businessId: string;
    email: string;
    name?: string;
    roles: string[];
    permissions: string[];
  };
}

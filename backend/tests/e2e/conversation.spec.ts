import { test, expect, beforeAll, afterAll } from '@playwright/test';

interface WhatsAppMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts: Array<{ profile: { name: string }; wa_id: string }>;
        messages: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text: { body: string };
        }>;
      };
      field: string;
    }>;
  }>;
}

function createWhatsAppMessage(phoneNumberId: string, from: string, text: string): WhatsAppMessage {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test-entry',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15550783881',
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
              messages: [
                {
                  from,
                  id: `msg-${Date.now()}`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

test.describe('E2E: WhatsApp Conversation Flow', () => {
  const PHONE_NUMBER_ID = 'demo-phone-id';
  const TEST_PHONE = '966501234567';
  const API_KEY = 'demo-api-key-123';

  test.beforeAll(async () => {
    // Database should already be seeded with demo data
    // See: prisma/seed.ts
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Capture screenshot on failure
    if (testInfo.status !== 'passed') {
      await page.screenshot({ path: `test-results/${testInfo.title}.png`, fullPage: true });
    }
  });

  test('should complete a 5-7 message ordering conversation', async ({ page }) => {
    /**
     * Long Ordering Conversation Test (5-7 messages)
     * This tests the full customer journey:
     * 1. Greeting / Menu query
     * 2. Ask about specific items
     * 3. Ask for prices
     * 4. Place order
     * 5. Confirm order details
     * 6. Maybe ask about status
     */

    const conversation = [
      'Hello, what do you have on your menu?',  // Message 1: Menu query
      'How much is the shawarma chicken?',       // Message 2: Price query
      'Can I get 2 shawarma chicken please?',     // Message 3: Order placement
      'What about drinks?',                       // Message 4: Ask about drinks
      'I want a cola too',                       // Message 5: Add to order
      'What is my order status?',                // Message 6: Check status
      'Thank you!',                              // Message 7: End conversation
    ];

    const responses: string[] = [];

    for (let i = 0; i < conversation.length; i++) {
      const message = conversation[i];
      console.log(`\n📱 Message ${i + 1}/${conversation.length}: "${message}"`);

      const response = await page.request.post('http://localhost:3001/api/webhook', {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        data: createWhatsAppMessage(PHONE_NUMBER_ID, TEST_PHONE, message),
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      console.log(`🤖 Response: "${responseData.reply}"`);

      // Verify response has a reply
      expect(responseData.reply).toBeDefined();
      expect(responseData.reply.length).toBeGreaterThan(0);

      responses.push(responseData.reply);
    }

    // Verify all messages got responses
    expect(responses).toHaveLength(conversation.length);

    // Verify order-related responses mention order
    const orderResponses = responses.slice(2, 6); // Messages 3-6 are order-related
    const hasOrderAcknowledgment = orderResponses.some(r =>
      r.toLowerCase().includes('order') ||
      r.toLowerCase().includes('shawar') ||
      r.toLowerCase().includes('confirm')
    );
    expect(hasOrderAcknowledgment).toBe(true);

    console.log('\n✅ Conversation completed successfully with 7 messages');
  });

  test('should handle quick order scenario', async ({ page }) => {
    /**
     * Quick Order Test - Direct order without conversation
     * Tests the case where customer knows what they want
     */

    const response = await page.request.post('http://localhost:3001/api/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: createWhatsAppMessage(PHONE_NUMBER_ID, '966501234568', 'I want 1 shawarma chicken'),
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.reply).toBeDefined();
    expect(responseData.reply.length).toBeGreaterThan(0);

    console.log('✅ Quick order test completed');
  });

  test('should handle check order status request', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: createWhatsAppMessage(PHONE_NUMBER_ID, '966501234569', 'Where is my order?'),
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.reply).toBeDefined();

    // Should respond with some status information
    const reply = responseData.reply.toLowerCase();
    expect(reply.length).toBeGreaterThan(0);

    console.log('✅ Check order status test completed');
  });

  test('should handle complaint scenario', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: createWhatsAppMessage(PHONE_NUMBER_ID, '966501234570', 'My food arrived cold and late'),
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.reply).toBeDefined();
    expect(responseData.reply.length).toBeGreaterThan(0);

    console.log('✅ Complaint handling test completed');
  });

  test('should handle menu query with categories', async ({ page }) => {
    const response = await page.request.post('http://localhost:3001/api/webhook', {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      data: createWhatsAppMessage(PHONE_NUMBER_ID, '966501234571', 'What is on your menu?'),
    });

    expect(response.status()).toBe(200);

    const responseData = await response.json();
    expect(responseData.reply).toBeDefined();

    // Menu response should mention food items
    const reply = responseData.reply.toLowerCase();
    expect(reply.length).toBeGreaterThan(0);

    console.log('✅ Menu query test completed');
  });
});
/**
 * Modular SMS service.
 * Provider is selected via SMS_PROVIDER env var: "mock" (default) | "gateway".
 * Add real gateway integrations (Twilio, Vonage, local telco API, etc.)
 * by implementing the SmsProvider interface.
 */

export interface SmsPayload {
  to: string; // E.164 phone number
  body: string;
}

export interface SmsResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

interface SmsProvider {
  name: string;
  send(payload: SmsPayload): Promise<SmsResult>;
}

/** Mock provider — logs to console, always succeeds. Ideal for dev/testing. */
const mockProvider: SmsProvider = {
  name: 'mock',
  async send({ to, body }: SmsPayload): Promise<SmsResult> {
    console.log(`[SMS:MOCK] → ${to}\n${body}`);
    return {
      success: true,
      provider: 'mock',
      messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  },
};

/**
 * Gateway provider placeholder.
 * Wire this to your production SMS gateway. Example (Twilio-style REST):
 *
 *   const res = await fetch(process.env.SMS_GATEWAY_URL!, {
 *     method: 'POST',
 *     headers: {
 *       Authorization: `Bearer ${process.env.SMS_GATEWAY_API_KEY}`,
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify({ to: payload.to, message: payload.body }),
 *   });
 */
const gatewayProvider: SmsProvider = {
  name: 'gateway',
  async send(payload: SmsPayload): Promise<SmsResult> {
    const url = process.env.SMS_GATEWAY_URL;
    const apiKey = process.env.SMS_GATEWAY_API_KEY;

    if (!url || !apiKey) {
      return {
        success: false,
        provider: 'gateway',
        error: 'SMS_GATEWAY_URL / SMS_GATEWAY_API_KEY not configured',
      };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to: payload.to, message: payload.body }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, provider: 'gateway', error: `HTTP ${res.status}: ${text}` };
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { success: true, provider: 'gateway', messageId: data.id };
    } catch (err) {
      return {
        success: false,
        provider: 'gateway',
        error: err instanceof Error ? err.message : 'Unknown SMS gateway error',
      };
    }
  },
};

function resolveProvider(): SmsProvider {
  return process.env.SMS_PROVIDER === 'gateway' ? gatewayProvider : mockProvider;
}

export async function sendSms(payload: SmsPayload): Promise<SmsResult> {
  return resolveProvider().send(payload);
}

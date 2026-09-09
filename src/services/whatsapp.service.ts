/**
 * Modular Meta WhatsApp Cloud API service.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * Requires: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN
 * Falls back to a console mock when credentials are missing (dev mode).
 */

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

export async function sendWhatsAppMessage(to: string, body: string): Promise<WhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // Dev-mode mock when Cloud API credentials are not configured
  if (!phoneNumberId || !accessToken) {
    console.log(`[WHATSAPP:MOCK] → ${to}\n${body}`);
    return {
      success: true,
      messageId: `wa_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { preview_url: false, body },
        }),
      },
    );

    const data = (await res.json().catch(() => ({}))) as {
      messages?: { id: string }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message ?? `WhatsApp Cloud API HTTP ${res.status}`,
      };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown WhatsApp error',
    };
  }
}

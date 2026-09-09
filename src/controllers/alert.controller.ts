import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSms } from '../services/sms.service';
import { sendWhatsAppMessage } from '../services/whatsapp.service';

function buildAlertMessage(
  userName: string,
  latitude?: number | null,
  longitude?: number | null,
  customMessage?: string | null,
): string {
  const lines = [
    '🚨 HIFATZAT EMERGENCY ALERT 🚨',
    `${userName} has triggered an SOS and may need immediate help.`,
  ];

  if (customMessage) {
    lines.push(`Message: ${customMessage}`);
  }

  if (latitude != null && longitude != null) {
    lines.push(`Location: https://maps.google.com/?q=${latitude},${longitude}`);
  } else {
    lines.push('Location: not available');
  }

  lines.push(`Time: ${new Date().toISOString()}`);
  return lines.join('\n');
}

/** POST /api/alerts/trigger — sends SMS + WhatsApp to all emergency contacts */
export async function triggerAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { latitude, longitude, message } = req.body as {
      latitude?: number;
      longitude?: number;
      message?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { contacts: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (user.contacts.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No emergency contacts configured. Add at least one contact before triggering SOS.',
      });
      return;
    }

    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        message: message?.trim() || null,
        status: 'PENDING',
      },
    });

    const body = buildAlertMessage(user.name, latitude, longitude, message);

    // Dispatch SMS + WhatsApp to every contact in parallel
    const dispatches = await Promise.all(
      user.contacts.map(async (contact) => {
        const [sms, whatsapp] = await Promise.all([
          sendSms({ to: contact.phone, body }),
          sendWhatsAppMessage(contact.phone, body),
        ]);
        return {
          contact: { id: contact.id, name: contact.name, phone: contact.phone },
          sms: { success: sms.success, error: sms.error },
          whatsapp: { success: whatsapp.success, error: whatsapp.error },
        };
      }),
    );

    const total = dispatches.length * 2;
    const delivered = dispatches.reduce(
      (acc, d) => acc + (d.sms.success ? 1 : 0) + (d.whatsapp.success ? 1 : 0),
      0,
    );

    const status = delivered === total ? 'SENT' : delivered > 0 ? 'PARTIAL' : 'FAILED';

    const updated = await prisma.alert.update({
      where: { id: alert.id },
      data: { status },
    });

    res.status(status === 'FAILED' ? 502 : 200).json({
      success: status !== 'FAILED',
      data: { alert: updated, dispatches },
    });
  } catch (err) {
    console.error('[alert.triggerAlert]', err);
    res.status(500).json({ success: false, message: 'Failed to trigger SOS alert' });
  }
}

/** GET /api/alerts/history */
export async function getAlertHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const alerts = await prisma.alert.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: { alerts } });
  } catch (err) {
    console.error('[alert.getAlertHistory]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch alert history' });
  }
}

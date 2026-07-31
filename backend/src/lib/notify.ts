interface OrderItemForNotify {
  nameSnapshot: string;
  kind: string;
  ml: number | null;
  qty: number;
  unitPrice: number;
}

interface OrderForNotify {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  notes: string | null;
  subtotal: number;
  items: OrderItemForNotify[];
}

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

function formatItem(item: OrderItemForNotify): string {
  const size = item.kind === 'product' && item.ml != null ? (item.ml === 0 ? ' (Full Bottle)' : ` (${item.ml}ml)`) : '';
  return `${item.qty}x ${item.nameSnapshot}${size}`;
}

// Fire-and-forget from the caller's perspective - a broken/unconfigured bot should never
// cause a customer's checkout to fail, so this only ever logs on failure.
// Telegram Bot API instead of email - Railway blocks outbound SMTP on non-Pro plans, and
// even ntfy.sh (a plain HTTPS POST) turned out to be IP-blocked from Railway's shared
// egress range. Telegram's API is confirmed reachable from Railway.
export async function sendNewOrderNotification(order: OrderForNotify): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not configured - skipping order notification.');
    return;
  }

  const address = [order.line1, order.line2, order.city, order.country].filter(Boolean).join(', ');
  const text = [
    `New order - ${order.subtotal} DH`,
    '',
    `${order.fullName} (${order.phone})`,
    address,
    order.notes ? `Notes: ${order.notes}` : null,
    '',
    order.items.map(formatItem).join('\n'),
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    });
    if (!res.ok) throw new Error(`Telegram API responded ${res.status}: ${await res.text()}`);
  } catch (err) {
    console.error('Failed to send order Telegram notification', err);
  }
}

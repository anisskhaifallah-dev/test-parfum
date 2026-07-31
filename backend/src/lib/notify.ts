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

const { NTFY_TOPIC } = process.env;

function formatItem(item: OrderItemForNotify): string {
  const size = item.kind === 'product' && item.ml != null ? (item.ml === 0 ? ' (Full Bottle)' : ` (${item.ml}ml)`) : '';
  return `${item.qty}x ${item.nameSnapshot}${size}`;
}

// Fire-and-forget from the caller's perspective - a broken/unconfigured topic should
// never cause a customer's checkout to fail, so this only ever logs on failure.
// Push notification via ntfy.sh (https://ntfy.sh/docs) instead of email - Railway blocks
// outbound SMTP on non-Pro plans, but this is a plain HTTPS POST, which isn't blocked.
export async function sendNewOrderNotification(order: OrderForNotify): Promise<void> {
  if (!NTFY_TOPIC) {
    console.warn('NTFY_TOPIC not configured - skipping order notification.');
    return;
  }

  const address = [order.line1, order.line2, order.city, order.country].filter(Boolean).join(', ');
  const body = [
    `${order.fullName} (${order.phone})`,
    address,
    order.notes ? `Notes: ${order.notes}` : null,
    '',
    order.items.map(formatItem).join(', '),
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body,
      headers: {
        Title: `New order - ${order.subtotal} DH`,
        Tags: 'shopping_cart',
        Priority: 'high',
      },
    });
    if (!res.ok) throw new Error(`ntfy responded ${res.status}`);
  } catch (err) {
    console.error('Failed to send order push notification', err);
  }
}

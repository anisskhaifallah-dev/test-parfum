import nodemailer from 'nodemailer';

interface OrderItemForEmail {
  nameSnapshot: string;
  kind: string;
  ml: number | null;
  qty: number;
  unitPrice: number;
}

interface OrderForEmail {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  country: string;
  notes: string | null;
  subtotal: number;
  items: OrderItemForEmail[];
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, NOTIFY_EMAIL } = process.env;

// Only set up if all the SMTP env vars are actually present - lets the app run fine
// locally/in environments where email isn't configured, instead of crashing on boot.
const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 465),
        secure: Number(SMTP_PORT ?? 465) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
      })
    : null;

function formatItem(item: OrderItemForEmail): string {
  const size = item.kind === 'product' && item.ml != null ? (item.ml === 0 ? ' (Full Bottle)' : ` (${item.ml}ml)`) : '';
  return `  ${item.qty} x ${item.nameSnapshot}${size} - ${item.unitPrice * item.qty} DH`;
}

// Fire-and-forget from the caller's perspective - a broken/unconfigured mail server
// should never cause a customer's checkout to fail, so this only ever logs on failure.
export async function sendNewOrderNotification(order: OrderForEmail): Promise<void> {
  if (!transporter || !NOTIFY_EMAIL) {
    console.warn('SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD/NOTIFY_EMAIL) - skipping order email.');
    return;
  }

  const address = [order.line1, order.line2, order.city, order.country].filter(Boolean).join(', ');
  const text = [
    `New order from ${order.fullName} (${order.phone})`,
    `Address: ${address}`,
    order.notes ? `Notes: ${order.notes}` : null,
    '',
    'Items:',
    ...order.items.map(formatItem),
    '',
    `Subtotal: ${order.subtotal} DH`,
    '',
    `Order ID: ${order.id}`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFY_EMAIL,
      subject: `New order from ${order.fullName} - ${order.subtotal} DH`,
      text,
    });
  } catch (err) {
    console.error('Failed to send order notification email', err);
  }
}

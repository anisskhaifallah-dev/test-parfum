// Any string interpolated into an innerHTML template - whether typed by a customer
// (checkout fields) or a staff member (product/pack name, blurb, size labels) - must go
// through this before rendering, since both are effectively untrusted from the browser's
// perspective and the staff dashboard reads customer-submitted order fields directly.
export function escapeHtml(value: string | null | undefined): string {
  const str = value ?? '';
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

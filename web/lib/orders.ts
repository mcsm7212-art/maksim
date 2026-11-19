// One clear phrase for every order state, from the point of view of the person looking at it.
export type OrderRole = 'client' | 'pro';
export type OrderLike = { status: string; client_confirmed_at?: string | null };

export function orderPhrase(b: OrderLike, role: OrderRole): { text: string; tone: 'wait' | 'act' | 'ok' | 'off' } {
  switch (b.status) {
    case 'assigning': return { text: 'The office is choosing your technician', tone: 'wait' };
    case 'needs_time': return role === 'client' ? { text: 'Price agreed: pick a time', tone: 'act' } : { text: 'Price agreed: waiting for the client to pick a time', tone: 'wait' };
    case 'requested': return role === 'client' ? { text: 'Waiting for the pro to confirm the visit', tone: 'wait' } : { text: 'Confirm the visit', tone: 'act' };
    case 'confirmed': return { text: 'Visit scheduled', tone: 'ok' };
    case 'on_the_way': return { text: 'The pro is on the way', tone: 'ok' };
    case 'in_progress': return { text: 'Work in progress', tone: 'ok' };
    case 'done': return b.client_confirmed_at ? { text: 'Job complete', tone: 'ok' }
      : role === 'client' ? { text: 'The pro reported the job done: please confirm', tone: 'act' } : { text: 'Waiting for the client to confirm', tone: 'wait' };
    case 'cancelled': return { text: 'Cancelled', tone: 'off' };
    default: return { text: b.status, tone: 'wait' };
  }
}

export const STEPS = ['Price agreed', 'Time picked', 'Visit confirmed', 'Work done', 'Client confirmed'] as const;
/** How many of STEPS are complete. */
export function stepIndex(b: OrderLike & { quote_id?: string | null }): number {
  const order = ['needs_time', 'requested', 'confirmed', 'on_the_way', 'in_progress', 'done'];
  const i = order.indexOf(b.status);
  if (b.status === 'done') return b.client_confirmed_at ? 5 : 4;
  if (i < 0) return 0;
  return [1, 2, 3, 3, 3][i] ?? 0;
}

export type QuoteLine = { kind: 'labor' | 'material' | 'trip' | 'urgent' | 'discount' | 'other'; label: string; amount: number };
export const LINE_KINDS: Record<QuoteLine['kind'], string> = { labor: 'Labor', material: 'Materials', trip: 'Trip / call-out', urgent: 'Urgency', discount: 'Discount', other: 'Other' };
export const PROBLEM_KINDS = { no_show: 'Pro did not come', quality: 'Quality of the work', price: 'Price is different from the quote', damage: 'Something was damaged', behavior: 'Behavior', other: 'Something else' } as const;

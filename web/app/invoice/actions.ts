'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMe } from '@/lib/auth';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export type InvoiceState = { error?: string } | undefined;
type Line = { kind: string; description: string; qty: number; price: number };
const KINDS = ['labor', 'material', 'fee', 'discount'];

export async function saveInvoice(_p: InvoiceState, f: FormData): Promise<InvoiceState> {
  if (!isLive()) return { error: 'Demo mode: nothing was saved. Connect the database to accept real sign-ups.' };
  const me = await getMe(); if (!me) redirect('/login?next=/account');
  let items: Line[] = [];
  try { items = JSON.parse(String(f.get('items') ?? '[]')); } catch { return { error: 'Add at least one line.' }; }
  items = items.filter((i) => i && String(i.description ?? '').trim() && Number(i.qty) > 0 && KINDS.includes(i.kind))
    .map((i) => ({ kind: i.kind, description: String(i.description).trim().slice(0, 140), qty: Math.min(1000, Number(i.qty)), price: Math.round(Math.abs(Number(i.price) || 0) * 100) / 100 }))
    .slice(0, 40);
  if (!items.length) return { error: 'Add at least one line.' };
  const row = {
    items, tax_rate: Math.min(15, Math.max(0, Number(f.get('tax_rate')) || 0)),
    notes: String(f.get('notes') ?? '').slice(0, 1000) || null,
    payment_instructions: String(f.get('payment') ?? '').slice(0, 500) || null,
    status: f.get('send') ? 'sent' : 'draft',
  };
  const sb = await supabaseServer();
  const id = String(f.get('id') ?? '');
  const res = id
    ? await sb.from('invoices').update(row).eq('id', id).select('id').single()
    : await sb.from('invoices').insert({ ...row, booking_id: String(f.get('booking')), created_by: me.id }).select('id').single();
  if (res.error) return { error: res.error.message };
  redirect(`/invoice/${res.data.id}`);
}

async function setInvoiceStatus(f: FormData, status: 'sent' | 'paid' | 'void') {
  const me = await getMe(); if (!me) redirect('/login');
  const sb = await supabaseServer();
  const id = String(f.get('id'));
  await sb.from('invoices').update({ status }).eq('id', id);
  revalidatePath(`/invoice/${id}`); revalidatePath('/account');
}
export async function sendInvoice(f: FormData) { await setInvoiceStatus(f, 'sent'); }
export async function markPaid(f: FormData) { await setInvoiceStatus(f, 'paid'); }
export async function voidInvoice(f: FormData) { await setInvoiceStatus(f, 'void'); }

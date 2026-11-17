import { redirect } from 'next/navigation';
import { CardBack, CardFront } from '@/components/BizCard';
import PrintButton from '@/components/PrintButton';
import { getMe } from '@/lib/auth';
import { cardData } from '@/lib/card-data';
import { getPro } from '@/lib/data';
import { getT } from '@/lib/i18n';
import { isLive } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';

export const metadata = { title: 'Print business cards' };

export default async function PrintCards() {
  const tr = await getT();
  if (!isLive()) redirect('/');
  const me = await getMe();
  if (!me?.pro) redirect('/login?next=/account/card/print');
  const pro = await getPro(me.pro.slug);
  if (!pro) redirect('/account');
  const { data: priv } = await (await supabaseServer()).from('pro_private').select('card_phone').eq('pro_id', me.id).maybeSingle();
  const d = await cardData(pro, priv?.card_phone ?? null, tr);
  const ten = Array.from({ length: 10 });
  return (
    <div className="printwrap">
      <div className="noprint pad" style={{ textAlign: 'center', marginBottom: 16, color: '#222' }}>
        <PrintButton label={tr('Print')} /> <span style={{ marginLeft: 10, fontSize: 14 }}>{tr('Page 1: fronts. Page 2: backs. Print both sides at 100% scale.')}</span>
      </div>
      <div className="sheet">{ten.map((_, i) => <CardFront key={i} d={d} />)}</div>
      <div className="sheet">{ten.map((_, i) => <CardBack key={i} d={d} />)}</div>
    </div>
  );
}

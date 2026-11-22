'use client';
import { useState } from 'react';
import { useT } from './I18n';

/** Send an invite link by text message, email, the phone's share sheet, or copy it. */
export default function InviteShare({ url, company, who }: { url: string; company: string; who?: string }) {
  const t = useT(); const [copied, setCopied] = useState(false);
  const text = `${who ? `${who}, ` : ''}${t('join {company} on NovaFides: open the link, sign in with your email and check your profile.', { company })} ${url}`;
  return (
    <span className="chips">
      <a className="btn ghost sm" href={`sms:?&body=${encodeURIComponent(text)}`}>💬 SMS</a>
      <a className="btn ghost sm" href={`mailto:?subject=${encodeURIComponent(`${company} · NovaFides`)}&body=${encodeURIComponent(text)}`}>✉ Email</a>
      <button type="button" className="btn ghost sm" onClick={async () => { try { if (navigator.share) await navigator.share({ title: company, text, url }); else { await navigator.clipboard.writeText(url); setCopied(true); } } catch { /* cancelled */ } }}>
        {copied ? `✓ ${t('Link copied')}` : `🔗 ${t('Copy link')}`}</button>
    </span>
  );
}

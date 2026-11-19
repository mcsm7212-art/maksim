import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostCard from '@/components/PostCard';
import { getMe } from '@/lib/auth';
import { getLang, getT } from '@/lib/i18n';
import { postById } from '@/lib/social';

export const dynamic = 'force-dynamic';

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, me, tr, lang] = await Promise.all([postById(id), getMe(), getT(), getLang()]);
  if (!p) notFound();
  return (
    <section className="sec pad"><div className="in" style={{ maxWidth: 680 }}>
      <div className="eyebrow"><Link href="/feed">{tr('Feed')}</Link></div>
      <PostCard p={p} tr={tr} lang={lang} mine={p.pro.id === me?.id} meId={me?.id ?? null} path={`/feed/${p.id}`} full />
    </div></section>
  );
}

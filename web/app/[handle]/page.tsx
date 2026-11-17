import { notFound, redirect } from 'next/navigation';
import ProPage, { generateMetadata as proMeta } from '../pro/[slug]/page';
import { resolveHandle } from '@/lib/data';

// Short address: novafides.com/max shows the pro page. Old addresses redirect to the current one.
type Props = { params: Promise<{ handle: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Props) {
  const slug = await resolveHandle((await params).handle);
  return slug ? proMeta({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) }) : { title: 'Not found' };
}

export default async function ShortAddress({ params, searchParams }: Props) {
  const { handle } = await params;
  const slug = await resolveHandle(handle);
  if (!slug) notFound();
  if (slug !== handle) redirect(`/${slug}`);
  return ProPage({ params: Promise.resolve({ slug }), searchParams });
}

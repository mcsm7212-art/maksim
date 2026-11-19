import LegalPage from '@/components/LegalPage';
import { getLang } from '@/lib/i18n';
import { PRIVACY, TERMS } from '@/lib/legal';

export const metadata = { title: 'Terms of Use' };
export default async function Terms() {
  const lang = await getLang();
  return <LegalPage doc={TERMS[lang]} other="/privacy" otherLabel={PRIVACY[lang].title} />;
}

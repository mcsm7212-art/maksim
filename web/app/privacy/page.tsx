import LegalPage from '@/components/LegalPage';
import { getLang } from '@/lib/i18n';
import { PRIVACY, TERMS } from '@/lib/legal';

export const metadata = { title: 'Privacy Policy' };
export default async function Privacy() {
  const lang = await getLang();
  return <LegalPage doc={PRIVACY[lang]} other="/terms" otherLabel={TERMS[lang].title} />;
}

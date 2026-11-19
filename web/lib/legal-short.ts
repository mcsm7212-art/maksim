// Small legal texts used in forms (kept apart from the long Terms and Privacy so pages stay light).
import type { Lang } from './i18n-core';

export const LEGAL_VERSION = '2026-11-19';
export const CONTACT_EMAIL = 'support@novafides.pro';



/** Short notice shown where a quote is sent or accepted and where a visit is booked. */
export const DISCLAIMER: Record<Lang, string> = {
  en: 'NovaFides is an information platform. It is not a party to the agreement between the client and the pro: the scope of work, price, payment, timing and warranty are agreed directly between them. Each pro is an independent business responsible for their own licenses, permits and insurance.',
  es: 'NovaFides es una plataforma de información. No es parte del acuerdo entre el cliente y el profesional: el alcance del trabajo, el precio, el pago, los plazos y la garantía se acuerdan directamente entre ellos. Cada profesional es un negocio independiente, responsable de sus propias licencias, permisos y seguro.',
  ru: 'NovaFides — информационная площадка. Она не является стороной договора между клиентом и мастером: объём работ, цена, оплата, сроки и гарантия согласуются напрямую между ними. Каждый мастер — независимый исполнитель и сам отвечает за свои лицензии, разрешения и страховку.',
};

/** California home-improvement rules, shown to pros when a quote is over $500. */
export const CA_PRO_NOTE: Record<Lang, string> = {
  en: 'California: for home-improvement work over $500, a licensed contractor must use a written contract with the required notices, and the down payment may not exceed 10% of the contract price or $1,000, whichever is less (Business and Professions Code §7159). This quote is not that contract.',
  es: 'California: para trabajos de mejoras del hogar de más de $500, el contratista con licencia debe usar un contrato escrito con los avisos requeridos, y el anticipo no puede superar el 10 % del precio o $1,000, lo que sea menor (Código de Negocios y Profesiones §7159). Este presupuesto no es ese contrato.',
  ru: 'Калифорния: для работ по дому дороже $500 лицензированный подрядчик обязан заключить письменный договор с обязательными уведомлениями, а предоплата не может превышать 10% цены или $1,000 — что меньше (Business and Professions Code §7159). Эта смета не заменяет такой договор.',
};


// Terms of Use and Privacy Policy in English, Spanish and Russian.
// DRAFT prepared for review by a California attorney (see docs/legal-notes-for-lawyer.md). English is the controlling version.
import type { Lang } from './i18n-core';

import { CONTACT_EMAIL, LEGAL_VERSION } from './legal-short';

export type LegalDoc = { title: string; updated: string; intro: string; sections: { h: string; p: string[] }[] };
export { CA_PRO_NOTE, CONTACT_EMAIL, DISCLAIMER, LEGAL_VERSION } from './legal-short';

const C = CONTACT_EMAIL;

const TERMS_EN: LegalDoc = {
  title: 'Terms of Use',
  updated: `Last updated: ${LEGAL_VERSION}`,
  intro: 'These Terms are an agreement between you and NovaFides Marketplace ("NovaFides", "we", "us") about using novafides.pro. By creating an account or using the site you agree to these Terms and to our Privacy Policy. If you do not agree, please do not use the site.',
  sections: [
    { h: '1. What NovaFides is', p: [
      'NovaFides is an information platform. It helps people in the San Francisco Bay Area find independent home-service professionals ("pros") and companies, see their profiles, prices, photos and reviews, send them requests, chat, and keep a record of the work.',
      'NovaFides is not a contractor and does not perform any work. Pros are independent businesses, not our employees, agents or partners. NovaFides is not a party to any agreement between a client and a pro.',
    ] },
    { h: '2. Agreements between clients and pros', p: [
      'The scope of work, price, payment method, schedule, materials, permits and any warranty are agreed directly between the client and the pro. Prices shown on the site, including "≈" estimates and quotes in chat, are information from the pro or market ranges; the final price is what the client and the pro agree.',
      'NovaFides does not process payments between clients and pros, does not hold deposits and does not guarantee the quality, safety, legality or timing of any work.',
      'In California, home-improvement work over $500 by a licensed contractor requires a written contract with the notices required by law, and the down payment may not exceed 10% of the price or $1,000, whichever is less. Unlicensed persons may only take jobs under the limit set by law (currently under $1,000 including labor and materials, with no building permit and no hired workers; a larger job may not be split). Pros are responsible for following these rules.',
    ] },
    { h: '3. Checks and badges', p: [
      'When a badge says that a license, identity or insurance was checked, it means we looked at the information available on the date shown. It is not a guarantee, an endorsement or insurance. You can verify a California license yourself at cslb.ca.gov.',
      'Demo profiles are marked "Demo profile" and are examples only; they cannot be booked.',
    ] },
    { h: '4. Accounts', p: [
      'You must be at least 18 years old. Give accurate information and keep your email account secure, because sign-in codes are sent there. One person may have only one pro profile. You are responsible for activity in your account.',
    ] },
    { h: '5. Rules for pros', p: [
      'Pros must hold every license, registration, permit and insurance required for the work they offer, describe their services and prices honestly, use their own real photos, and post only photos of work they did. Before-and-after photos must not show faces, house numbers, addresses or personal items without the client\'s consent.',
      'NovaFides is free for pros during the launch. If a paid subscription is introduced, we will announce it at least 30 days in advance by email and in the pro account, with the price and start date. Nothing is charged without that notice. NovaFides does not sell leads.',
    ] },
    { h: '6. Reviews', p: [
      'Only a client with a finished job booked through NovaFides can review that job. Reviews must be honest and about the client\'s own experience. We do not remove or hide honest negative reviews and we do not accept payment for reviews.',
      'To protect the rating from manipulation, a review whose author follows an unusual pattern may count less in the rating; it stays visible with the reason, and a person reviews it. Reviews that are fake, threatening, abusive, contain personal data or are not about the job may be hidden after a report.',
    ] },
    { h: '7. Content you post', p: [
      'You keep ownership of the photos, texts and other content you post. You give NovaFides a non-exclusive, worldwide, royalty-free license to host, show, resize and share that content on the site and in its promotion of your profile, for as long as it is on the site. You confirm you have the right to post it.',
    ] },
    { h: '8. Prohibited conduct', p: [
      'Do not: post false information; impersonate anyone; harass, threaten or discriminate; post others\' personal data; offer or request payment for reviews; spam; scrape the site; break its security; or use it for anything illegal.',
    ] },
    { h: '9. Links and affiliate links', p: [
      'The site links to other websites, such as stores where a part can be bought. Some Amazon links are affiliate links: as an Amazon Associate, NovaFides earns from qualifying purchases. This does not change the price you pay. We are not responsible for other websites.',
    ] },
    { h: '10. AI features', p: [
      'Some features, such as photo search, part identification and the reply tone check, use artificial intelligence. Their results can be wrong. Check a part number on the old part or ask a pro before buying, and let a pro confirm the job on site.',
    ] },
    { h: '11. Disclaimers', p: [
      'The site is provided "as is" and "as available". To the fullest extent permitted by law, NovaFides disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement, and does not warrant the work, conduct, licenses or insurance of any pro or client.',
    ] },
    { h: '12. Limitation of liability', p: [
      'To the fullest extent permitted by law, NovaFides is not liable for indirect, incidental, special, consequential or punitive damages, or for property damage, personal injury or losses arising from work performed or agreements made between users. Our total liability for any claim relating to the site is limited to $100. Some laws do not allow these limits, so they may not apply to you.',
    ] },
    { h: '13. Indemnity', p: [
      'If you are a pro or company, you agree to defend and indemnify NovaFides against claims arising from your work, your agreements with clients, your content, or your breach of these Terms or the law.',
    ] },
    { h: '14. Disputes between users', p: [
      'Disputes about work, price or payment are between the client and the pro. NovaFides may help: use "Report a problem" inside the order. We may suspend accounts that break these Terms.',
    ] },
    { h: '15. Ending your use', p: [
      'You may stop using the site at any time and ask us to close your account. We may suspend or close an account that breaks these Terms. Reviews already published about a pro\'s work stay on the platform.',
    ] },
    { h: '16. Changes', p: [
      'We may update these Terms. For important changes we will notify you by email or on the site before they take effect. If you keep using the site after that, the updated Terms apply.',
    ] },
    { h: '17. Law', p: [
      'These Terms are governed by the laws of the State of California, without regard to conflict-of-laws rules. Translations are provided for convenience; the English version controls.',
    ] },
    { h: '18. Contact', p: [`Questions: ${C}.`] },
  ],
};

const TERMS_ES: LegalDoc = {
  title: 'Términos de uso',
  updated: `Última actualización: ${LEGAL_VERSION}`,
  intro: 'Estos Términos son un acuerdo entre usted y NovaFides Marketplace ("NovaFides", "nosotros") sobre el uso de novafides.pro. Al crear una cuenta o usar el sitio, acepta estos Términos y nuestra Política de privacidad. Si no está de acuerdo, no use el sitio.',
  sections: [
    { h: '1. Qué es NovaFides', p: [
      'NovaFides es una plataforma de información. Ayuda a las personas del Área de la Bahía de San Francisco a encontrar profesionales independientes de servicios para el hogar ("profesionales") y empresas, ver sus perfiles, precios, fotos y reseñas, enviarles solicitudes, chatear y guardar un registro del trabajo.',
      'NovaFides no es contratista y no realiza ningún trabajo. Los profesionales son negocios independientes, no nuestros empleados, agentes ni socios. NovaFides no es parte de ningún acuerdo entre un cliente y un profesional.',
    ] },
    { h: '2. Acuerdos entre clientes y profesionales', p: [
      'El alcance del trabajo, el precio, la forma de pago, el horario, los materiales, los permisos y cualquier garantía se acuerdan directamente entre el cliente y el profesional. Los precios del sitio, incluidas las estimaciones "≈" y los presupuestos en el chat, son información del profesional o rangos del mercado; el precio final es el que acuerden el cliente y el profesional.',
      'NovaFides no procesa pagos entre clientes y profesionales, no guarda anticipos y no garantiza la calidad, seguridad, legalidad ni los plazos de ningún trabajo.',
      'En California, los trabajos de mejoras del hogar de más de $500 hechos por un contratista con licencia requieren un contrato escrito con los avisos exigidos por ley, y el anticipo no puede superar el 10 % del precio o $1,000, lo que sea menor. Las personas sin licencia solo pueden aceptar trabajos por debajo del límite legal (actualmente menos de $1,000 con mano de obra y materiales, sin permiso de construcción y sin empleados; un trabajo grande no puede dividirse). Los profesionales son responsables de cumplir estas reglas.',
    ] },
    { h: '3. Verificaciones e insignias', p: [
      'Cuando una insignia indica que se verificó una licencia, identidad o seguro, significa que revisamos la información disponible en la fecha indicada. No es una garantía, un respaldo ni un seguro. Puede verificar una licencia de California en cslb.ca.gov.',
      'Los perfiles de demostración están marcados como "Perfil de demostración", son solo ejemplos y no se pueden reservar.',
    ] },
    { h: '4. Cuentas', p: [
      'Debe tener al menos 18 años. Proporcione información verdadera y mantenga segura su cuenta de correo, porque allí se envían los códigos de acceso. Una persona solo puede tener un perfil de profesional. Usted es responsable de la actividad en su cuenta.',
    ] },
    { h: '5. Reglas para profesionales', p: [
      'Los profesionales deben tener todas las licencias, registros, permisos y seguros que exige el trabajo que ofrecen, describir con honestidad sus servicios y precios, usar fotos reales propias y publicar solo fotos de trabajos que hicieron. Las fotos de antes y después no deben mostrar caras, números de casa, direcciones ni objetos personales sin el consentimiento del cliente.',
      'NovaFides es gratis para los profesionales durante el lanzamiento. Si se introduce una suscripción de pago, la anunciaremos con al menos 30 días de anticipación por correo y en la cuenta del profesional, con el precio y la fecha de inicio. No se cobra nada sin ese aviso. NovaFides no vende contactos.',
    ] },
    { h: '6. Reseñas', p: [
      'Solo un cliente con un trabajo terminado reservado en NovaFides puede reseñar ese trabajo. Las reseñas deben ser honestas y sobre su propia experiencia. No eliminamos ni ocultamos reseñas negativas honestas y no aceptamos pagos por reseñas.',
      'Para proteger la calificación de manipulaciones, una reseña cuyo autor sigue un patrón inusual puede contar menos; sigue visible con el motivo, y una persona la revisa. Las reseñas falsas, amenazantes, ofensivas, con datos personales o que no tratan del trabajo pueden ocultarse tras una denuncia.',
    ] },
    { h: '7. Contenido que publica', p: [
      'Usted conserva la propiedad de las fotos, textos y demás contenido que publica. Otorga a NovaFides una licencia no exclusiva, mundial y gratuita para alojar, mostrar, redimensionar y compartir ese contenido en el sitio y en la promoción de su perfil, mientras esté en el sitio. Confirma que tiene derecho a publicarlo.',
    ] },
    { h: '8. Conductas prohibidas', p: [
      'No: publique información falsa; se haga pasar por otra persona; acose, amenace o discrimine; publique datos personales de otros; ofrezca o pida pagos por reseñas; envíe spam; extraiga datos del sitio; vulnere su seguridad; ni lo use para algo ilegal.',
    ] },
    { h: '9. Enlaces y enlaces de afiliado', p: [
      'El sitio enlaza a otros sitios web, como tiendas donde se puede comprar una pieza. Algunos enlaces de Amazon son de afiliado: como Asociado de Amazon, NovaFides gana con las compras que califican. Esto no cambia el precio que usted paga. No somos responsables de otros sitios.',
    ] },
    { h: '10. Funciones de IA', p: [
      'Algunas funciones, como la búsqueda por foto, la identificación de piezas y la revisión del tono de las respuestas, usan inteligencia artificial. Sus resultados pueden ser incorrectos. Confirme el número en la pieza vieja o pregunte a un profesional antes de comprar, y deje que un profesional confirme el trabajo en el lugar.',
    ] },
    { h: '11. Exención de garantías', p: [
      'El sitio se ofrece "tal cual" y "según disponibilidad". En la máxima medida permitida por la ley, NovaFides rechaza toda garantía, expresa o implícita, incluidas las de comerciabilidad, idoneidad para un fin determinado y no infracción, y no garantiza el trabajo, la conducta, las licencias ni el seguro de ningún profesional o cliente.',
    ] },
    { h: '12. Limitación de responsabilidad', p: [
      'En la máxima medida permitida por la ley, NovaFides no responde por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por daños a la propiedad, lesiones o pérdidas derivadas de trabajos realizados o acuerdos entre usuarios. Nuestra responsabilidad total por cualquier reclamo relacionado con el sitio se limita a $100. Algunas leyes no permiten estos límites, por lo que podrían no aplicarse a usted.',
    ] },
    { h: '13. Indemnización', p: [
      'Si usted es profesional o empresa, acepta defender e indemnizar a NovaFides frente a reclamos derivados de su trabajo, sus acuerdos con clientes, su contenido o el incumplimiento de estos Términos o de la ley.',
    ] },
    { h: '14. Disputas entre usuarios', p: [
      'Las disputas sobre el trabajo, el precio o el pago son entre el cliente y el profesional. NovaFides puede ayudar: use "Reportar un problema" dentro del pedido. Podemos suspender cuentas que incumplan estos Términos.',
    ] },
    { h: '15. Fin del uso', p: [
      'Puede dejar de usar el sitio en cualquier momento y pedirnos cerrar su cuenta. Podemos suspender o cerrar una cuenta que incumpla estos Términos. Las reseñas ya publicadas sobre el trabajo de un profesional permanecen en la plataforma.',
    ] },
    { h: '16. Cambios', p: [
      'Podemos actualizar estos Términos. Para cambios importantes le avisaremos por correo o en el sitio antes de que entren en vigor. Si sigue usando el sitio después, se aplican los Términos actualizados.',
    ] },
    { h: '17. Ley aplicable', p: [
      'Estos Términos se rigen por las leyes del Estado de California, sin tener en cuenta sus normas de conflicto de leyes. Las traducciones son por conveniencia; prevalece la versión en inglés.',
    ] },
    { h: '18. Contacto', p: [`Preguntas: ${C}.`] },
  ],
};

const TERMS_RU: LegalDoc = {
  title: 'Условия использования',
  updated: `Обновлено: ${LEGAL_VERSION}`,
  intro: 'Эти Условия — соглашение между вами и NovaFides Marketplace («NovaFides», «мы») об использовании сайта novafides.pro. Создавая аккаунт или пользуясь сайтом, вы соглашаетесь с этими Условиями и с Политикой конфиденциальности. Если вы не согласны, пожалуйста, не пользуйтесь сайтом.',
  sections: [
    { h: '1. Что такое NovaFides', p: [
      'NovaFides — информационная площадка. Она помогает жителям района залива Сан-Франциско находить независимых мастеров и компании по обслуживанию дома, смотреть их профили, цены, фото и отзывы, отправлять запросы, переписываться и хранить историю работ.',
      'NovaFides не является подрядчиком и не выполняет работы. Мастера — независимые исполнители, а не наши сотрудники, агенты или партнёры. NovaFides не является стороной договора между клиентом и мастером.',
    ] },
    { h: '2. Договорённости между клиентом и мастером', p: [
      'Объём работ, цена, способ оплаты, сроки, материалы, разрешения и гарантия согласуются напрямую между клиентом и мастером. Цены на сайте, включая оценки «≈» и сметы в чате, — информация от мастера или средние по рынку; окончательная цена — та, о которой договорились клиент и мастер.',
      'NovaFides не принимает и не передаёт платежи между клиентами и мастерами, не хранит предоплату и не гарантирует качество, безопасность, законность и сроки работ.',
      'В Калифорнии для работ по дому дороже $500 лицензированный подрядчик обязан заключить письменный договор с обязательными уведомлениями, а предоплата не может превышать 10% цены или $1,000 — что меньше. Без лицензии можно браться только за работы до установленного законом предела (сейчас до $1,000 вместе с работой и материалами, без разрешения на строительство и без наёмных работников; большую работу нельзя делить на части). За соблюдение этих правил отвечают мастера.',
    ] },
    { h: '3. Проверки и значки', p: [
      'Если значок говорит, что лицензия, личность или страховка проверены, это значит, что мы посмотрели доступную информацию на указанную дату. Это не гарантия, не рекомендация и не страховка. Калифорнийскую лицензию можно проверить самостоятельно на cslb.ca.gov.',
      'Демо-профили отмечены «Демо-профиль», это только примеры, их нельзя забронировать.',
    ] },
    { h: '4. Аккаунт', p: [
      'Вам должно быть не меньше 18 лет. Указывайте правдивые данные и берегите доступ к своей почте: туда приходят коды для входа. У одного человека может быть только один профиль мастера. Вы отвечаете за действия в своём аккаунте.',
    ] },
    { h: '5. Правила для мастеров', p: [
      'Мастер обязан иметь все лицензии, регистрации, разрешения и страховку, которые нужны для его работ, честно описывать услуги и цены, использовать свои настоящие фото и выкладывать только фото своих работ. На фото «до/после» не должно быть лиц, номеров домов, адресов и личных вещей без согласия клиента.',
      'На время запуска NovaFides бесплатна для мастеров. Если появится платная подписка, мы объявим её не меньше чем за 30 дней по почте и в кабинете мастера, с ценой и датой начала. Без такого уведомления ничего не списывается. NovaFides не продаёт заявки.',
    ] },
    { h: '6. Отзывы', p: [
      'Оставить отзыв может только клиент, у которого есть завершённый заказ через NovaFides. Отзыв должен быть честным и о собственном опыте. Мы не удаляем и не скрываем честные негативные отзывы и не берём деньги за отзывы.',
      'Чтобы защитить рейтинг от накруток, отзыв автора с необычной закономерностью может меньше влиять на рейтинг; он остаётся на виду с причиной, и его проверяет человек. Фейковые, угрожающие, оскорбительные отзывы, отзывы с личными данными или не о работе могут быть скрыты после жалобы.',
    ] },
    { h: '7. Ваш контент', p: [
      'Фото, тексты и другой контент, который вы публикуете, остаются вашими. Вы даёте NovaFides неисключительную, бесплатную, действующую во всём мире лицензию хранить, показывать, уменьшать и распространять этот контент на сайте и при продвижении вашего профиля, пока он находится на сайте. Вы подтверждаете, что имеете право его публиковать.',
    ] },
    { h: '8. Запрещено', p: [
      'Нельзя: публиковать ложную информацию; выдавать себя за другого; оскорблять, угрожать, дискриминировать; публиковать чужие личные данные; предлагать или просить деньги за отзывы; рассылать спам; массово копировать данные сайта; взламывать его; использовать сайт для незаконных целей.',
    ] },
    { h: '9. Ссылки и партнёрские ссылки', p: [
      'На сайте есть ссылки на другие сайты, например магазины, где можно купить деталь. Некоторые ссылки на Amazon — партнёрские: как участник программы Amazon Associates, NovaFides получает вознаграждение с подходящих покупок. Цена для вас от этого не меняется. Мы не отвечаем за другие сайты.',
    ] },
    { h: '10. Функции ИИ', p: [
      'Некоторые функции — поиск по фото, определение детали, проверка тона ответа — используют искусственный интеллект. Их результаты могут быть ошибочными. Сверяйте номер на старой детали или спросите мастера перед покупкой; точную работу подтверждает мастер на месте.',
    ] },
    { h: '11. Отказ от гарантий', p: [
      'Сайт предоставляется «как есть» и «по мере доступности». В максимальной степени, разрешённой законом, NovaFides отказывается от любых явных и подразумеваемых гарантий, включая пригодность для продажи, для определённой цели и ненарушение прав, и не гарантирует работу, поведение, лицензии или страховку любого мастера или клиента.',
    ] },
    { h: '12. Ограничение ответственности', p: [
      'В максимальной степени, разрешённой законом, NovaFides не отвечает за косвенные, случайные, особые, последующие или штрафные убытки, а также за ущерб имуществу, травмы или потери, связанные с работами или договорённостями между пользователями. Наша общая ответственность по любому требованию, связанному с сайтом, ограничена суммой $100. Некоторые законы не допускают таких ограничений, поэтому они могут к вам не применяться.',
    ] },
    { h: '13. Возмещение', p: [
      'Если вы мастер или компания, вы обязуетесь защищать NovaFides и возмещать её расходы по требованиям, связанным с вашей работой, вашими договорённостями с клиентами, вашим контентом или нарушением вами этих Условий или закона.',
    ] },
    { h: '14. Споры между пользователями', p: [
      'Споры о работе, цене или оплате решаются между клиентом и мастером. NovaFides может помочь: нажмите «Сообщить о проблеме» в заказе. Мы можем приостановить аккаунты, нарушающие эти Условия.',
    ] },
    { h: '15. Прекращение использования', p: [
      'Вы можете в любой момент перестать пользоваться сайтом и попросить закрыть аккаунт. Мы можем приостановить или закрыть аккаунт, нарушающий эти Условия. Уже опубликованные отзывы о работе мастера остаются на площадке.',
    ] },
    { h: '16. Изменения', p: [
      'Мы можем обновлять эти Условия. О важных изменениях мы сообщим по почте или на сайте до того, как они вступят в силу. Если вы продолжаете пользоваться сайтом после этого, действуют обновлённые Условия.',
    ] },
    { h: '17. Право', p: [
      'Эти Условия регулируются законами штата Калифорния без учёта коллизионных норм. Переводы даны для удобства; основной является английская версия.',
    ] },
    { h: '18. Связь', p: [`Вопросы: ${C}.`] },
  ],
};

const PRIVACY_EN: LegalDoc = {
  title: 'Privacy Policy',
  updated: `Last updated: ${LEGAL_VERSION}`,
  intro: 'This policy explains what personal information NovaFides collects, why, who receives it and what rights you have, including under the California Consumer Privacy Act (CCPA) as amended by the CPRA.',
  sections: [
    { h: '1. What we collect', p: [
      'Account: email, name, role (client, pro, company). Pros and companies: business name, trade, CSLB license number, photo, service area, prices, schedule, work photos and, for verification, identity and insurance information.',
      'Phone and location: a phone number is optional. A client\'s number goes only to the one pro the client sends it to (a call-back request or a booking). A pro chooses who sees their number: everyone, or only clients whose job they confirmed. When a pro goes online with location, the position is rounded to about half a mile before it is saved; the exact position is never stored or shown. An address you type in a booking form is sent to an OpenStreetMap search service to suggest matching addresses.',
      'Requests and jobs: the service, notes, photos you attach, city and ZIP, the address for a booked visit, quotes, order status, invoices, parts installed, reviews and ratings.',
      'Messages and community: chats, posts, comments, questions, answers, saved pros, colleague lists and, if you turn it on, neighbor settings (city, street without house number, interests).',
      'Technical: device and browser data, pages viewed, cookies needed to keep you signed in and to remember your language, theme and sound setting.',
      'Photo search: a photo you upload for search is analyzed and not stored.',
    ] },
    { h: '2. Why we use it', p: [
      'To run the platform: accounts and sign-in, showing profiles, sending your request to the pro you choose, chat, orders, invoices, reviews and notifications; to check pros; to keep the site safe and prevent fraud and fake reviews; to answer support requests; to improve the site; and to meet legal obligations.',
    ] },
    { h: '3. Who receives it', p: [
      'The pro or company you choose receives your request, photos and messages; your full address is shared only after you book a visit. Your public review shows your first name and last initial. Pros see private client ratings from other pros only as described in our rules.',
      'Service providers that work for us under contract: Supabase (database, storage, sign-in), Vercel (hosting), Anthropic (AI photo analysis and reply tone check), Google (fonts, and the background-removal model downloaded to your device). Authorities, when the law requires.',
      'We do not sell your personal information and do not share it for cross-context behavioral advertising. When you click an Amazon or other store link, that store may collect information under its own policy.',
    ] },
    { h: '4. How long we keep it', p: [
      'Account data while your account is open. Jobs, invoices and reviews as long as needed for the record of the work, disputes and legal obligations; published reviews stay on the pro\'s profile. Photo-search uploads are not kept.',
    ] },
    { h: '5. Your California privacy rights', p: [
      'You have the right to know what personal information we collect, use and disclose; to get a copy; to delete it; to correct it; to opt out of sale or sharing (we do not sell or share); to limit the use of sensitive personal information (we use it only to provide the service and to verify pros); and not to be discriminated against for using these rights.',
      `To make a request, email ${C} from the email of your account. We will verify your identity and answer within 45 days. An authorized agent may make a request for you with your written permission.`,
    ] },
    { h: '6. Children', p: ['NovaFides is not for people under 18, and we do not knowingly collect information from children.'] },
    { h: '7. Security', p: ['We use encryption in transit, access rules on every database table, and sign-in codes instead of passwords. No system is perfectly secure; please keep your email account safe.'] },
    { h: '8. Changes', p: ['We will post updates here with a new date and tell you about important changes before they take effect.'] },
    { h: '9. Contact', p: [`Privacy questions and requests: ${C}.`] },
  ],
};

const PRIVACY_ES: LegalDoc = {
  title: 'Política de privacidad',
  updated: `Última actualización: ${LEGAL_VERSION}`,
  intro: 'Esta política explica qué información personal recopila NovaFides, para qué, quién la recibe y qué derechos tiene, incluidos los de la Ley de Privacidad del Consumidor de California (CCPA), modificada por la CPRA.',
  sections: [
    { h: '1. Qué recopilamos', p: [
      'Cuenta: correo, nombre, función (cliente, profesional, empresa). Profesionales y empresas: nombre comercial, oficio, número de licencia CSLB, foto, zona de servicio, precios, horario, fotos de trabajos y, para la verificación, datos de identidad y seguro.',
      'Teléfono y ubicación: el número de teléfono es opcional. El número de un cliente llega solo al profesional al que el cliente lo envía (solicitud de llamada o reserva). El profesional elige quién ve su número: todos, o solo los clientes cuyo trabajo confirmó. Cuando un profesional se conecta con ubicación, la posición se redondea a unos 800 metros antes de guardarse; la posición exacta nunca se guarda ni se muestra. La dirección que escribes en un formulario de reserva se envía a un servicio de búsqueda de OpenStreetMap para sugerir direcciones.',
      'Solicitudes y trabajos: el servicio, notas, fotos adjuntas, ciudad y código postal, la dirección de una visita reservada, presupuestos, estado del pedido, facturas, piezas instaladas, reseñas y calificaciones.',
      'Mensajes y comunidad: chats, publicaciones, comentarios, preguntas, respuestas, profesionales guardados, listas de colegas y, si lo activa, ajustes de vecinos (ciudad, calle sin número, intereses).',
      'Datos técnicos: dispositivo y navegador, páginas vistas, cookies necesarias para mantener la sesión y recordar idioma, tema y sonido.',
      'Búsqueda por foto: la foto que sube para buscar se analiza y no se guarda.',
    ] },
    { h: '2. Para qué la usamos', p: [
      'Para operar la plataforma: cuentas y acceso, mostrar perfiles, enviar su solicitud al profesional que elija, chat, pedidos, facturas, reseñas y avisos; para verificar profesionales; para mantener el sitio seguro y evitar fraudes y reseñas falsas; para atender soporte; para mejorar el sitio; y para cumplir obligaciones legales.',
    ] },
    { h: '3. Quién la recibe', p: [
      'El profesional o la empresa que usted elija recibe su solicitud, fotos y mensajes; su dirección completa se comparte solo después de reservar una visita. Su reseña pública muestra su nombre y la inicial del apellido.',
      'Proveedores que trabajan para nosotros por contrato: Supabase (base de datos, almacenamiento, acceso), Vercel (alojamiento), Anthropic (análisis de fotos con IA y revisión del tono), Google (fuentes y el modelo para quitar el fondo, descargado a su dispositivo). Autoridades, cuando la ley lo exija.',
      'No vendemos su información personal ni la compartimos para publicidad conductual entre contextos. Si hace clic en un enlace de Amazon u otra tienda, esa tienda puede recopilar información según su propia política.',
    ] },
    { h: '4. Cuánto tiempo la guardamos', p: [
      'Los datos de la cuenta mientras esté abierta. Trabajos, facturas y reseñas el tiempo necesario para el registro del trabajo, disputas y obligaciones legales; las reseñas publicadas permanecen en el perfil del profesional. Las fotos de búsqueda no se guardan.',
    ] },
    { h: '5. Sus derechos de privacidad en California', p: [
      'Tiene derecho a saber qué información personal recopilamos, usamos y divulgamos; a obtener una copia; a eliminarla; a corregirla; a excluirse de la venta o el intercambio (no vendemos ni compartimos); a limitar el uso de información sensible (solo la usamos para prestar el servicio y verificar profesionales); y a no ser discriminado por ejercer estos derechos.',
      `Para hacer una solicitud, escriba a ${C} desde el correo de su cuenta. Verificaremos su identidad y responderemos en un plazo de 45 días. Un agente autorizado puede hacer la solicitud por usted con su permiso por escrito.`,
    ] },
    { h: '6. Menores', p: ['NovaFides no es para menores de 18 años y no recopilamos a sabiendas información de menores.'] },
    { h: '7. Seguridad', p: ['Usamos cifrado en tránsito, reglas de acceso en cada tabla de la base de datos y códigos de acceso en lugar de contraseñas. Ningún sistema es perfectamente seguro; mantenga segura su cuenta de correo.'] },
    { h: '8. Cambios', p: ['Publicaremos aquí las actualizaciones con una nueva fecha y le avisaremos de los cambios importantes antes de que entren en vigor.'] },
    { h: '9. Contacto', p: [`Preguntas y solicitudes de privacidad: ${C}.`] },
  ],
};

const PRIVACY_RU: LegalDoc = {
  title: 'Политика конфиденциальности',
  updated: `Обновлено: ${LEGAL_VERSION}`,
  intro: 'Здесь объясняется, какие личные данные собирает NovaFides, зачем, кто их получает и какие у вас права, в том числе по калифорнийскому закону о защите данных потребителей (CCPA с поправками CPRA).',
  sections: [
    { h: '1. Что мы собираем', p: [
      'Аккаунт: почта, имя, роль (клиент, мастер, компания). Мастера и компании: название, специальность, номер лицензии CSLB, фото, район работы, цены, расписание, фото работ и, для проверки, данные о личности и страховке.',
      'Телефон и местоположение: номер телефона необязателен. Номер клиента получает только тот мастер, которому клиент сам его отправил (заказ звонка или запись). Мастер сам выбирает, кто видит его номер: все или только клиенты, чей заказ он подтвердил. Когда мастер выходит онлайн с геолокацией, место округляется примерно до километра перед сохранением; точное место не хранится и не показывается. Адрес, который вы вводите в форме записи, отправляется в поисковый сервис OpenStreetMap, чтобы подсказать подходящие адреса.',
      'Запросы и заказы: услуга, описание, приложенные фото, город и ZIP, адрес забронированного визита, сметы, статус заказа, счета, установленные детали, отзывы и оценки.',
      'Сообщения и сообщество: чаты, посты, комментарии, вопросы, ответы, сохранённые мастера, списки коллег и, если вы включили, настройки «Соседи» (город, улица без номера дома, интересы).',
      'Технические данные: устройство и браузер, просмотренные страницы, cookie, нужные, чтобы вы оставались в аккаунте и чтобы запомнить язык, тему и звук.',
      'Поиск по фото: фото, загруженное для поиска, анализируется и не сохраняется.',
    ] },
    { h: '2. Зачем мы их используем', p: [
      'Чтобы площадка работала: аккаунт и вход, показ профилей, отправка вашего запроса выбранному мастеру, чат, заказы, счета, отзывы и уведомления; чтобы проверять мастеров; чтобы защищать сайт от мошенничества и фейковых отзывов; чтобы отвечать в поддержке; чтобы улучшать сайт; и чтобы выполнять требования закона.',
    ] },
    { h: '3. Кто их получает', p: [
      'Выбранный вами мастер или компания получают ваш запрос, фото и сообщения; полный адрес передаётся только после бронирования визита. В публичном отзыве видны ваше имя и первая буква фамилии.',
      'Сервисы, которые работают на нас по договору: Supabase (база данных, хранение файлов, вход), Vercel (хостинг), Anthropic (анализ фото с помощью ИИ и проверка тона ответа), Google (шрифты и модель для удаления фона, которая скачивается на ваше устройство). Государственные органы — когда этого требует закон.',
      'Мы не продаём ваши личные данные и не передаём их для поведенческой рекламы. Если вы переходите по ссылке на Amazon или в другой магазин, этот магазин может собирать данные по своим правилам.',
    ] },
    { h: '4. Сколько мы их храним', p: [
      'Данные аккаунта — пока аккаунт открыт. Заказы, счета и отзывы — сколько нужно для истории работ, споров и требований закона; опубликованные отзывы остаются в профиле мастера. Фото для поиска не хранятся.',
    ] },
    { h: '5. Ваши права в Калифорнии', p: [
      'Вы вправе узнать, какие личные данные мы собираем, используем и передаём; получить копию; удалить их; исправить; отказаться от продажи или передачи (мы не продаём и не передаём); ограничить использование чувствительных данных (мы используем их только для работы сервиса и проверки мастеров); и не подвергаться дискриминации за использование этих прав.',
      `Чтобы отправить запрос, напишите на ${C} с почты вашего аккаунта. Мы проверим, что это вы, и ответим в течение 45 дней. Уполномоченный представитель может подать запрос за вас с вашего письменного разрешения.`,
    ] },
    { h: '6. Дети', p: ['NovaFides не предназначена для лиц младше 18 лет, и мы сознательно не собираем данные детей.'] },
    { h: '7. Безопасность', p: ['Мы используем шифрование при передаче, правила доступа к каждой таблице базы данных и коды для входа вместо паролей. Абсолютно защищённых систем не бывает; берегите доступ к своей почте.'] },
    { h: '8. Изменения', p: ['Обновления будут публиковаться здесь с новой датой, а о важных изменениях мы сообщим заранее.'] },
    { h: '9. Связь', p: [`Вопросы и запросы о данных: ${C}.`] },
  ],
};

export const TERMS: Record<Lang, LegalDoc> = { en: TERMS_EN, es: TERMS_ES, ru: TERMS_RU };
export const PRIVACY: Record<Lang, LegalDoc> = { en: PRIVACY_EN, es: PRIVACY_ES, ru: PRIVACY_RU };

# Global classifieds and C2C marketplaces (Europe and the Americas): what users value, what they complain about, and how the best features work

Scope: Craigslist, Facebook Marketplace, Kleinanzeigen (DE), Leboncoin (FR), Vinted, Wallapop (ES), Gumtree, Kijiji (CA), OLX (BR), Marktplaats (NL), Blocket/FINN (Nordics). Research date: Nov 2026.

Method note: Only web search snippets were available. WebFetch to techcrunch.com, siliconcanals.com and monsterdealz.de failed because the session's network policy blocks those hosts, so no full article was read. Many figures below come from search summaries of secondary sources (blogs, forums). Each is flagged where reliability is lower. Mercado Libre classifieds, App Store/Google Play ratings and published UX research were not covered (see Gaps).

## 1. Ad posting UX: photo-first posting, AI auto-fill, price suggestions, search, alerts, map/radius

### Takeaway
By 2026 the standard is photo first: the seller uploads a photo and AI drafts the title, description and category, and suggests a price from nearby comparable items. Facebook Marketplace has the most complete version (March 2026, plus a separate Seller app in July 2026). Kleinanzeigen's AI mainly writes descriptions; full photo-only creation was rolling out by platform and category. I found no evidence of an AI price suggestion at Kleinanzeigen.

### Cited Findings
- **Facebook Marketplace (March 2026):** after the seller uploads an image, Meta AI creates a draft listing, fills in the details and suggests a price based on similar items in the area. The same update added AI auto-replies to buyer questions. Sellers can turn these on, preview them and edit them while creating the listing. — [TechCrunch, 12 Mar 2026](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages); [PYMNTS](https://www.pymnts.com/meta/2026/meta-ai-writes-listings-and-sets-prices-for-facebook-marketplace-sellers/)
- **Meta "Seller" app (July 2026, iOS):** a separate app for power sellers. The seller uploads photos and Meta AI fills in title, description, suggested price and category. It also has bulk listing creation, a unified inbox and performance insights, and a web version is in testing. Meta has not published performance metrics. — [The Next Web, 24 Jul 2026](https://thenextweb.com/news/meta-seller-app-facebook-marketplace-ai-listing?type=AI); [iPhone in Canada](https://www.iphoneincanada.ca/2026/07/24/facebook-marketplace-gets-dedicated-ai-app-to-make-selling-easier/)
- One hands-on test rated Meta's AI listing tool better than many AI listing tools launched by competing marketplaces. This is a single review, not a benchmark. — [Value Added Resource](https://www.valueaddedresource.net/meta-ai-listing-facebook-marketplace/)
- **Kleinanzeigen:** the current flow is photo, then title, then category, then switch on AI help. The AI drafts a description that the seller can edit before publishing. The helper has existed since around the end of 2025 and launched on iOS first. Reports describe photo-only generation of title, description and category as the next step, coming to Android and more categories. Only a sponsored article claims it is already broadly live, so treat that claim as unverified. — [mobiflip](https://www.mobiflip.de/kleinanzeigen-fuehrt-ki-gestuetzte-anzeigenerstellung-per-foto-ein/amp/); [retail-news.de](https://retail-news.de/ki-anzeigen-per-foto-kleinanzeigen-app/); [GIGA](https://www.giga.de/tech/kleinanzeigen-neue-app-funktion-nimmt-euch-die-arbeit-ab--01KABB1FRKNGA414346KH57RRV)
- Kleinanzeigen is also adding an AI answer to buyers' "Was letzte Preis?" ("what's your lowest price?") messages, and has a ChatGPT integration for AI search. — [iphone-ticker.de](https://www.iphone-ticker.de/was-letzte-preis-kleinanzeigen-ki-soll-zukuenftig-antworten-liefern-281029/); [retail-news.de](https://retail-news.de/kleinanzeigen-integration-chatgpt-ki-suche/)
- **Leboncoin:** personalised search alerts are a core feature. — [Clubic](https://www.clubic.com/actualite-575277-leboncoin-attention-aux-arnaques-on-vous-aide-a-dejouer-les-pieges.html)

### Inferences
- Best practice: photo, then an AI draft (title, category, attributes, description), then a price suggestion drawn from local comparables, then the seller edits. Every AI field stays editable before publishing. Facebook also sets up chat auto-replies inside the posting flow, which links the posting and chat experiences.
- The "Was letzte Preis?" pattern shows that classifieds platforms are now using AI on the most common low-value chat messages, not only on posting.

### Gaps
- No primary-source detail on saved searches or alerts, map/radius search, or filter UX for most platforms. Search results gave only passing mentions.
- No published conversion data, for example posting-completion uplift from AI auto-fill.

## 2. Trust and safety: verification, ratings, buyer protection, integrated payment and shipping, anti-scam in chat

### Takeaway
Two models dominate. (a) The buyer pays an escrow-style "protection" fee of roughly a fixed amount plus 4.5–5%, and the seller pays nothing. Money is held until the buyer confirms receipt or a deadline passes (Vinted, Kleinanzeigen Sicher bezahlen, Leboncoin, Wallapop, OLX Garantia, FINN Fiks ferdig). (b) Identity verification through a strong national eID or bank ID (BankID at FINN and Blocket, Interac Verified at Kijiji). Anti-scam work in chat focuses on keeping communication and payment on-platform: hiding phone numbers, warning about links, and warning when a phone number is shared. Marktplaats is the best-documented case, with payment-request fraud down 77%.

### Cited Findings
**Escrow / buyer-protection fees (who pays and how much):**
- **Vinted:** sellers have paid nothing since 2016. Buyers pay a Buyer Protection fee, which is the main revenue source. One source puts it at about $0.70 + about 5%, another at 3–8% of the item price. It is non-refundable even when the item is returned. — [Retail Insight Network](https://www.retail-insight-network.com/features/the-business-model-behind-vinteds-success/); [RevenueMemo](https://www.revenuememo.com/p/how-does-vinted-make-money)
- **Kleinanzeigen "Sicher bezahlen":** the buyer pays and private sellers pay nothing. Older sources give €0.35 + 4.5%; 2026 sources citing the official help page (updated 17 Sep 2026) give €0.50 + 4.5%. Protection covers items that do not arrive or differ substantially from the description. A payment provider holds the money in trust, and the buyer has about 10 days after shipping to report a problem. Klarna was added as a payment option (2025/26) with no extra cost beyond the protection fee. — [monsterdealz](https://www.monsterdealz.de/magazin/kleinanzeigen-sicher-bezahlen); [e-recht24](https://www.e-recht24.de/ecommerce/13270-ebay-kleinanzeigen-kaeuferschutz.html); [techbook](https://www.techbook.de/shop-pay/kleinanzeigen-klarna)
- **Leboncoin paiement sécurisé:** the buyer pays about €0.70 + 5% for shipped transactions and a flat fee of about €0.99 for hand delivery (2026 blog). The percentage reportedly rose from 4% to 5% (forum, 2025). Money goes to the seller only when the transaction completes; opening a dispute suspends it; a lost parcel means cancellation and a refund. — [margeoapp](https://margeoapp.com/blog/frais-leboncoin-2026-vendeur-particulier-pro); [Que Choisir forum](https://forum.quechoisir.org/post1218726.html); [Leboncoin official page](https://www.leboncoin.fr/paiement-securise-livraison); [Kohen Avocats](https://kohenavocats.fr/?p=2162755)
- Leboncoin uses Mondial Relay pickup points, with a promotion of €0.99 shipping to a pickup point. — [Dealabs](https://www.dealabs.com/bons-plans/livraison-a-099eur-en-point-relais-mondial-relay-sur-leboncoin-3216865)
- **Wallapop (Protect / Envíos):** no commission on in-person sales. Shipped sales carry a protection fee, which is a fixed €1.69 for items priced €1–13 (guide dated May 2025). Shipping costs about €2.95–12 and the buyer mainly pays it. If a parcel is lost, Wallapop refunds both sides. Under the DAC7 tax rules, Wallapop reports sellers with more than 30 items or €2,000 a year sold through its transactional services to the Spanish tax authority. — [androidguias](https://androidguias.com/envios-wallapop/); [mundobytes](https://mundobytes.com/wallapop-quien-se-hace-cargo-de-los-gastos-de-envio-tasas-de-transaccion/); [OCU](https://www.ocu.org/reclamar/lista-reclamaciones-publicas/problema-con-wallapop-envios-y/4af016077c8dede8ea); [AEDAF](https://aedaf.es/en/about-aedaf/acuerdo-wallapop-592)
- **OLX Brazil:** OLX Pay (launched in 2020, built with Adyen) was renamed "Garantia da OLX". Payment is held until delivery is confirmed, and the seller is paid into an in-app wallet within 48 hours of delivery. Fee figures conflict: one 2026 blog says 8–12%, while other reports describe a move to charging buyers rather than sellers ("taxa zero" for sellers). These figures are unverified. — [Canaltech](https://canaltech.com.br/apps/como-funciona-a-entrega-do-olx/); [Jivochat](https://www.jivochat.com.br/blog/vendas/como-vender-no-olx.html); [TecMundo](https://www.tecmundo.com.br/mercado/290417-olx-anuncia-fim-taxas-vendedores-nova-forma-pagamento-site.htm); [OnlineMarketplaces](https://www.onlinemarketplaces.com/?p=103536); [Adyen](https://www.adyen.com/pt_BR/centro-de-conhecimento/olx-brasil-lanca-solucao-de-pagamentos-digital-em-parceria-com-a-adyen)
- **FINN.no Fiks ferdig:** FINN recommends it as the safest way to trade. The buyer receives and approves the item before the seller is paid; one listing mentions a 24-hour inspection window. FINN warns about fake "Fiks ferdig" links sent by email. — [FINN help](https://hjelpesenter.finn.no/hc/no/articles/22646962362130-Hva-er-den-tryggeste-m%C3%A5ten-%C3%A5-handle-p%C3%A5-FINN); [DNB](https://www.dnb.no/dnbnyheter/no/din-okonomi/unngaa-svindel-paa-finn)

**Identity verification:**
- **FINN:** a blue checkmark means the user is BankID-verified. Verification is optional for most users, allows only one verified account per BankID, and requires a Norwegian address. DNB advises checking for the checkmark and the user's ratings. — [FINN help: verified user](https://hjelpesenter.finn.no/hc/no/articles/22650637283858); [FINN: why verify](https://hjelpesenter.finn.no/hc/no/articles/22642799684754-Hvorfor-verifisere-brukeren-min)
- **Blocket (Sweden):** BankID was first optional. In May 2024 Blocket moved to require BankID verification for all accounts to make fraud harder. A 2024 fraud wave used fake sites to steal sellers' BankID details. — [Vi Bilägare](https://www.vibilagare.se/nyheter/blocket-skarper-kraven-bankid-alla-anvandare); [Blocket press release](https://www.mynewsdesk.com/se/blocket/pressreleases/nu-infoer-blocket-bankid-ett-nytt-verktyg-i-vaart-saekerhetsarbete-3183162)
- **Kijiji (Canada):** the optional "Interac Verified" badge launched in April 2026. Kijiji's FAQ says the badge does not guarantee accuracy, is not an endorsement, and that verified users can still be scammers. — [iPhone in Canada](https://www.iphoneincanada.ca/2026/04/14/kijiji-teams-up-with-interac-to-finally-tackle-marketplace-identity-scams/); [Kijiji verification](https://www.kijiji.ca/verification)
- **Gumtree South Africa:** the verified badge is based on matching the user's SA ID number against the government database. — [Gumtree ZA](https://www.gumtree.co.za/blog/news/how-gumtree-empowers-customers-to-do-business-with-safety-as-a-top-priority)

**Anti-scam measures in chat (Marktplaats is the best-documented case):**
- Payment-request ("betaalverzoek") fraud on Marktplaats fell 77% over two years after joint work with Limburg police. Another source says "more than 75%". At peak there were about 1,000 reports a month and at least €500k a month in losses; afterwards about 100 a month. — [NOS](https://nos.nl/l/2462294); [Emerce](https://www.emerce.nl/wire/politie-marktplaats-bundelen-krachten-betaalverzoekfraude-ruim-75-afgenomen)
- **What Marktplaats did:** it stopped showing private sellers' phone numbers by default on new ads, shows a fraud warning pop-up when a seller chooses to share a number, warns users actively about scam methods, and lets an iDEAL payment request include buyer protection, so the seller is paid only after the buyer confirms receipt. — [NL Times](https://nltimes.nl/node/64153); [Security Management](https://www.securitymanagement.nl/minder-betaalverzoekfraude-na-samenwerking-politie-en-marktplaats/)
- **Link warnings:** Marktplaats warns when a link's address differs from trusted domains (2019). A NOS test found that a newly registered domain passed through chat as a clickable link with no warning, so the filter is not airtight. — [NL Times 2019](https://nltimes.nl/2019/07/15/marktplaats-teams-police-banks-fight-payment-fraud); [NOS](https://nos.nl/l/2294859)
- A headline reports that Marktplaats stopped "gelijk oversteken" (a mutual handover of item and payment); details were not retrieved. — [id.nl](https://id.nl/huis-en-entertainment/mobiel/smartphone-en-tablet/marktplaats-stopt-met-gelijk-oversteken-hoe-kun-je-veilig-betalen)
- **Common scam scripts across platforms:** fake "secure payment" links asking for insurance, activation or delivery fees (Leboncoin, OLX); a €0.01 "verification" payment or 6-digit code request (Marktplaats); requests for an ID photo or selfie "to verify the transaction" (Leboncoin). OLX's own survey found fake payment was the most common fraud on the platform in 2024. — [Que Choisir](https://www.quechoisir.org/actualite-vente-entre-particuliers-arnaque-au-paiement-securise-sur-le-bon-coin-n99816/); [bunq](https://help.bunq.com/d/54500-anti-fraud-guide-fraudulent-verification-requests-on-marktplaats); [Serasa](https://www.serasa.com.br/premium/blog/golpe-olx/); [WeLiveSecurity](https://www.welivesecurity.com/fr/fraude/6-principales-escroqueries-a-eviter-sur-leboncoin-et-autres-plateformes-de-vente-entre-particuliers/)

### Inferences
- Effective anti-fraud combines product friction (hidden phone numbers, warnings at the moment of risk, link checks) with on-platform escrow. Marktplaats' 77% fall in payment-request fraud is the strongest quantified evidence that keeping users on-platform works.
- Escrow creates a new kind of attack: phishing pages that copy the platform's own "secure payment" brand. Platforms need to state plainly that payment links never arrive by email or WhatsApp, and that all links are on the official domain (Marktplaats publishes its official domains).
- A strong eID (BankID) works best where it is near-universal (Nordics). Elsewhere, verification stays optional and limited (Kijiji's badge carries disclaimers).

### Gaps
- No primary data on Vinted or Leboncoin chat link-blocking, or on "suspicious message" banners in chat.
- Mechanics of ratings after a transaction (two-way, blind, time-limited) were not verified for any platform.
- Facebook Marketplace's current shipping, checkout and verification status was not found.

## 3. Chat design: quick replies, make-an-offer, read receipts, notifications

### Takeaway
The best-documented structured negotiation is Vinted's. Offers are a first-class chat object with hard limits: a maximum discount of 40% and 25 offers a day. A seller's counter-price is visible only to that buyer. Sellers configure automatic bundle discount tiers. Facebook and Kleinanzeigen are adding AI auto-replies for routine questions.

### Cited Findings
- **Vinted "Make an offer":** a buyer can offer up to 40% below the listed price and can send up to 25 offers a day. The seller can accept, decline or counter, and can set a personal price up to 40% lower that only that buyer sees; others still see the listed price. Offers cover the item only, not postage or fees. — [Vinted Help](https://www.vinted.co.uk/help/3/422)
- **Vinted bundles:** sellers turn on "Bundle discounts" and set a percentage per number of items ("—" means no discount for that tier). The discount applies automatically at checkout. Pro sellers cannot offer bundle discounts, but buyers still save on shipping by bundling. Buyers can also make an offer on the bundle total. — [Vinted Help 260](https://www.vinted.co.uk/help/260-buying-a-bundle); [Vinted Help](https://www.vinted.co.uk/help/257); [OneShop](https://tools.oneshop.com/blog/bundles-in-vinted)
- Facebook Marketplace AI auto-replies are set up while creating the listing. — [TechCrunch](https://techcrunch.com/2026/03/12/facebook-marketplace-now-lets-meta-ai-respond-to-buyers-messages)

### Inferences
- Capping lowball offers (a 40% maximum discount) is a direct product answer to the lowball complaint. A daily offer cap limits offer spam.
- Private counter-prices allow negotiation without publicly cutting the listing price.

### Gaps
- No sourced data on read receipts, quick-reply chips (for example "Is this still available?") or notification strategy for any platform. This needs a direct app teardown.

## 4. Why Vinted and Facebook Marketplace grew, and why Craigslist users stay

### Takeaway
Vinted grew on a free-to-list, buyer-pays model plus integrated shipping. In 2025 it handled €10.8bn in volume (+47%) and reached €1.1bn in revenue (+38%). Facebook Marketplace grew on a ready-made social identity and distribution, reaching about 1 billion users, but its moderation was largely reactive. Craigslist keeps its lead in US horizontal classifieds traffic through a stable, ad-free, algorithm-free and mostly free interface, even though its revenue has fallen sharply.

### Cited Findings
- **Vinted 2025:** marketplace volume of €10.8bn (+47% year on year), revenue of €1.1bn (+38%; one outlet says about 40%), net profit of €62m (−19%), adjusted EBITDA of €151m (−5%) and free cash flow of €137m (+36%). Spending went into German expansion and its logistics arm, Vinted Go. — [Hargreaves Lansdown](https://www.hl.co.uk/shares/stock-market-news/company--news/vinted-reports-strong-revenue-growth,-profits-decline); [STV](https://news.stv.tv/world/vinted-sales-surge-to-almost-1bn-as-second-hand-shopping-stays-on-trend); [Silicon Canals](https://siliconcanals.com/n-in-2008-a-woman-in-vilnius-was-moving-flat-with-more-clothes-than-would-fit-so-a-friend-built-her-a-website-to-give-them-away-to-friends-in-2025-that-website-moved-e10-8-billion-of-second-hand-goods/)
- **Vinted's model shift (2016):** seller fees were removed and the buyer protection fee was introduced. — [Retail Insight Network](https://www.retail-insight-network.com/features/the-business-model-behind-vinteds-success/)
- **Facebook Marketplace:** about 1 billion users (ProPublica, 2021). Moderators described the work as "100 per cent reactive", acting after victims were already defrauded. ProPublica linked Marketplace crime to robberies and 13 homicides (2021–22 data, now dated). — [ProPublica](https://www.propublica.org/article/facebook-grew-marketplace-to-1-billion-users-now-scammers-are-using-it-to-target-people-around-the-world)
- **Craigslist:** it still leads US horizontal classifieds by visits (2025 industry report), but the gap with rivals has narrowed. Users and commentators cite no ads, no pop-ups, no algorithmic feed, little tracking, mostly free listings and a design that has barely changed. Reported revenue is about $302m in 2024, down from about $1.035bn at its 2018 peak (secondary source, unverified; figures conflict). HBS commentators warn that this resistance to change risks obsolescence. — [WebProNews](https://www.webpronews.com/craigslist-turns-30-thriving-with-minimalist-design-and-no-ads); [letsdatascience](https://letsdatascience.com/news/craigslist-defies-algorithmic-platforms-with-simplicity-9f383f36); [Notable Weekly](https://notabledaily.beehiiv.com/p/why-craigslist-still-feels-like-the-last-real-place-on-the-internet); [HBS Digital](https://d3.harvard.edu/platform-digit/submission/craigslist-the-remarkable-but-potentially-obsolete-success-story-of-the-ultimate-platform/index.html)

### Inferences
- **Lessons on simplicity:** (1) Free listing for private sellers is the baseline. Monetise buyers through optional protection, or pros through paid categories, not ordinary sellers. (2) Keep the core flow short and stable; users value predictability. (3) Avoid clutter such as ads and pop-ups on core screens. (4) Social or real identity reduces anonymity at no cost to users, as Facebook Marketplace shows. However, scale without proactive moderation brings serious fraud.

### Gaps
- No primary Meta figure for current Marketplace monthly users (2025–26).

## 5. Top complaints, app ratings, published UX research

### Takeaway
Complaints follow the same pattern across platforms: scams (fake payment links, overpayment, fake screenshots), opaque account suspensions with bot-only support (Vinted), buyer-protection fees seen as paying for weak protection (Leboncoin, Vinted), seller-unfriendly dispute outcomes (Blocket), and no-shows and lowballs (Facebook Marketplace, mostly anecdotal). Vinted was the fourth most complained-about company on the UK complaints site Resolver by late 2025.

### Cited Findings
- **Vinted:** reviewers describe suspensions for alleged counterfeit, commercial selling or multiple accounts with no evidence shown, no human contact and templated or bot replies. Some say buyer protection did not protect them in disputes. Vinted was the fourth most complained-about company on Resolver towards the end of 2025 and has not committed to an alternative dispute resolution (ADR) scheme. — [Resolver](https://news.resolver.co.uk/?p=8400); [Trustpilot vinted.ie](https://www.trustpilot.com/review/vinted.ie?page=6)
- **Leboncoin:** forum users say paiement sécurisé is "neither protection nor insurance" and that few users get compensated. One reported case: a buyer paid 5% on a €520 item and received a €10 magnifying glass instead. These are anecdotes. — [Que Choisir forum](https://forum.quechoisir.org/post1218726.html); [Custplace](https://fr.custplace.com/leboncoin/leboncoin-ma-fait-payer-120-eur-pour-une-erreur-de-mondial-relay-le-piege-du-paiement-securise-4372609)
- **Blocket:** forum users say disputes over its buyer-protection package almost always side with the buyer, leaving sellers little protection (anecdotal). — [SweClockers](https://www.sweclockers.com/forum/post/21149533)
- **Facebook Marketplace:** overpayment scams, fake payment screenshots, too-cheap bait listings (for example cars) and no-shows. No-shows appear in vendor blogs but are not quantified. The FTC has been cited as finding shopping fraud the most reported type of social-media scam in 2025, via a secondary source. — [NordPass](https://nordpass.com/blog/facebook-marketplace-scams/); [Omniwatch](https://www.omniwatch.com/blog/facebook-marketplace-scams/)
- **Gumtree UK (old, 2016):** Citizens Advice reported that one in six consumer complaints about Gumtree involved scams or fraud. — [The Drum](https://www.thedrum.com/news/2016/01/07/how-gumtree-addressing-online-fraud-and-ad-blocking-become-biggest-website-uk)
- **Wallapop:** public complaints to the Spanish consumer group OCU cluster around lost or damaged shipments and delayed payouts. — [OCU](https://www.ocu.org/reclamar/lista-reclamaciones-publicas/problema-para-recibir-mi-diner/e9c933173600777ebb)

### Inferences
- A non-refundable protection fee creates resentment when disputes go badly. If you charge buyers for protection, the dispute process must be fast and transparent, with a human escalation path.
- Opaque, automated enforcement (suspensions) is the main driver of Vinted's negative reviews even as the business grows. Explaining suspensions and offering a human appeal is a clear differentiator.

### Gaps
- No current App Store or Google Play star ratings or review counts were retrieved for any platform.
- No published UX research or case studies (for example Baymard, NN/g, company design blogs) were found within the tool budget.
- Mercado Libre classifieds (vehicles, real estate, services) were not researched.
- Kijiji and Gumtree 2025 complaint data was not found.

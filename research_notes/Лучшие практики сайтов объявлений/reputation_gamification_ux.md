# Reputation, Gamification and Trust Design in Freelance/Gig Marketplaces + Marketplace UX Research

Research date: 2026-11-15. Method note: in this session, direct fetching of official help centers (help.fiverr.com, support.upwork.com, airbnb.com, help.etsy.com) was **blocked by the sandbox network allowlist**. Thresholds below therefore come from web-search snippets of official pages where available, otherwise from third-party guides (flagged). Verify exact numbers on the official pages before publishing.

## 1. Exact criteria and thresholds for levels/badges, how they are displayed, and their effect on conversion

### Takeaway
All major platforms use the same recipe: a rolling time window (3–12 months) + minimum volume (orders/earnings/stays) + a quality floor (rating ~4.4–4.8, or JSS ≥90%) + operational reliability (response rate ~80–95%, cancellations ≤1%, late shipment ≤3%), re-evaluated on a fixed cadence (biweekly to quarterly) and granted automatically, with the top tier sometimes adding manual review. Formulas for composite scores (Fiverr Success Score, Upwork JSS) are deliberately not fully published.

### Cited Findings

**Fiverr (level system revamped in 2023–2024; levels: New → Level 1 → Level 2 → Top Rated; Fiverr Pro is a separate, application/vetted tier)**
- Success Score (1–10, measured relative to freelancers in a similar price range) thresholds: Level 1 ≥5, Level 2 ≥7, Top Rated ≥9; formula/weights not published — [SellerOS guide](https://sellerosforfiverr.com/guides/fiverr-seller-levels); [Zenlance 2026](https://zenlance.net/fiverr-level-system/)
- Level 1 (as reported citing Fiverr Help article): Success Score 5+, rating 4.4+, 80% response rate, 5 orders, 3 unique clients, $400 earnings — [EduEarnHub 2026](https://eduearnhub.com/fiverr-seller-levels/); one outlier source lists 10 orders/$500 — [Spy Opinion](https://www.spyopinion.com/blog/what-are-fiverr-levels/) (treat as outdated/outlier)
- Level 2: 120 active days, 20 orders from ≥10 unique clients, $2,000 lifetime earnings, rating 4.6+, response rate 90%+, Success Score ≥7 — [Zenlance](https://zenlance.net/fiverr-seller-levels/); [fiverrpromotion.net](https://fiverrpromotion.net/blog/fiverr-seller-levels-explained-2026-new-requirements-that-most-sellers-are-missing/)
- Top Rated: rating 4.7+, 90% response rate, 40 orders, 20 unique clients, $10,000 earnings, Success Score 9+, ~180 days at Level 2, plus **manual review** by Fiverr staff — [EduEarnHub](https://eduearnhub.com/fiverr-seller-levels/); [Zenlance](https://zenlance.net/fiverr-level-system/)
- Success Score is described as built from client satisfaction, communication, cancellations, revision patterns, disputes and **private buyer feedback** (third-party description; Fiverr does not publish the formula) — [fiverrpromotion.net](https://fiverrpromotion.net/blog/fiverr-seller-levels-explained-2026-new-requirements-that-most-sellers-are-missing/)

**Upwork (JSS + badges: Rising Talent, Top Rated, Top Rated Plus; Expert-Vetted is a separate curated tier)**
- JSS at a high level = (successful contract outcomes − negative outcomes) / total outcomes; includes public ratings and **private client feedback**, so a 5-star public review can coexist with poor private feedback — [Upwork Help: What is a JSS](https://support.upwork.com/hc/en-us/articles/38437362753171-What-is-a-Job-Success-Score); [LevelUpUpwork](https://www.levelupupwork.com/blog/good-job-success-score-upwork); [Upsight 2026](https://www.upsight.fyi/blog/upwork-job-success-score-guide)
- Rising Talent: if no JSS yet — average rating ≥4.8 and ≥$250 earned in 12 months, 100% complete profile and identity verification; if JSS exists, must be ≥90% — [Upwork Help: talent badges](https://support.upwork.com/hc/en-us/articles/211063568-Understand-freelancer-talent-badges); [Zenlance](https://zenlance.net/upwork-rising-talent-badge/)
- Top Rated ("top 10% of talent"): current JSS ≥90% and Rising Talent or 90%+ JSS in at least 13 of the last 16 weeks, first project >90 days ago, $1,000 earned in 12 months — [Upwork Help: talent badges](https://support.upwork.com/hc/en-us/articles/211063568-Understand-freelancer-talent-badges); one older FAQ says 12 weeks — conflict noted — [trendsonup](https://trendsonup.com/resources/job-success-score/)
- Top Rated Plus ("top 3%"): keep Top Rated + >$10,000 earned in 12 months ($20,000 for agencies) + at least one large contract with no negative outcome (large contract ≈ $5,000 in writing, $15,000 in software, varies by category); eligibility recalculated every two weeks — [Upwex 2026](https://upwex.io/blog/mastering-upwork-a-guide-to-earning-badges-and-building-reputation/); [EduEarnHub](https://eduearnhub.com/upwork-top-rated/)

**Airbnb Superhost**
- Assessed quarterly (Jan 1, Apr 1, Jul 1, Oct 1) on the previous 365 days; granted automatically, no application — [Airbnb Help 829](https://www.airbnb.com/help/article/829); [Avantstay](https://www.avantstay.com/blog/airbnb-superhost-requirements/)
- Criteria: overall rating ≥4.8 (past year); ≥10 stays or 3 reservations totalling ≥100 nights; response rate ≥90%; cancellation rate ≤1% (extenuating-circumstances exceptions) — [Airbnb Resource Center "How to become a Superhost"](https://www.airbnb.com/resources/hosting-homes/a/how-to-become-a-superhost-702); [Tidy](https://www.tidy.com:443/blog/how-to-become-a-superhost-on-airbnb-tips-and-requirements); [Smoobu](https://www.smoobu.com/en/guides/airbnb/airbnb-superhost)
- A review counts toward the rating once both parties submitted or the 14-day window closed; only listings where the host is owner (not co-host) count — [Airbnb Help 829](https://www.airbnb.com/help/article/829); [Airbnb "latest updates to Superhost assessments"](https://www.airbnb.ca/resources/hosting-homes/a/160)

**Etsy Star Seller** (launched 2021; changed after seller backlash)
- Evaluated monthly (on the 1st) over a rolling 3-month window: ≥95% of first buyer messages answered within 24 h (not counted if no messages), ≥95% orders shipped on time with tracking, average review ≥4.8; badge appears within ~24 h — [Etsy Help: track progress](https://help.etsy.com/hc/articles/29665255990039); [Craftybase](https://craftybase.com/blog/how-to-become-etsy-star-seller); [Gelato](https://gelato.com/blog/etsy-star-seller)
- Etsy changed the rating calculation so 4-star reviews count more positively, after seller complaints — [eSeller365 "Etsy caves to grievances"](https://eseller365.com/?p=30433); [LitCommerce](https://litcommerce.com/blog/how-to-become-etsy-star-seller/)

**eBay Top Rated Seller (TRS) / Top Rated Plus**
- TRS: account ≥90 days, ≥100 transactions and ≥$1,000 sales to US buyers in 12 months, transaction defect rate ≤0.5% (≤3 defects from unique buyers), cases closed without seller resolution ≤0.3% (≤2), late shipment rate ≤3% (≤5), tracking uploaded within handling time on ~95% of orders; evaluated monthly on the 20th — [eBay Seller Center: Top Rated Program](https://www.ebay.com/sellercenter/protections/top-rated-program); [3dsellers 2026](https://www.3dsellers.com/blog/ebay-top-rated-seller)
- Top Rated Plus is a **per-listing** badge requiring same/1-business-day handling and ≥30-day free returns; gives 10% final value fee discount — [eBay Seller Center](https://www.ebay.com/sellercenter/protections/top-rated-program); [Underpriced 2026](https://www.underpriced.app/blog/ebay-top-rated-seller-guide-2026)
- Note: eBay's criteria are purely operational (defects, cases, late shipping), not star-average based — a contrast to Airbnb/Etsy.

**Kwork (RU)**
- Current scheme (per 2026 third-party source): Новичок (default) → Продвинутый (10 completed orders, ≤10% negative reviews) → Профессионал (50 orders, <8% negative). Higher levels unlock messaging buyers and sending individual offers — [3SELLER Journal 2026](https://3seller.com/journal/blog/kwork-kak-nachat-rabotat-novichku-v-2026-7-shagov-do-pervyh-zakazov); official FAQ: [Kwork blog: 10 вопросов об уровне продавца](https://blog.kwork.ru/kak-sdelat/10-voprosov-ob-urovne-prodavca-na-kwork-vsyo-chto-nuzhno-znat-frilanseru)
- Older scheme (Специалист/Профессионал/Эксперт at 10/20 orders, ≥90% rating) is outdated — [КВОРК Мануал](https://kwork-manual.ru/reytingi-i-urovni-prodavtsov-v-kwork-ru/)
- 5-star rating depends on completed orders, refusals/cancellations, positive/negative reviews; no paid rating boosts — [КВОРК Мануал](https://kwork-manual.ru/reytingi-i-urovni-prodavtsov-v-kwork-ru/)

**Airtasker (AU/UK)**
- Badges are verification-based rather than performance tiers: ID Verified (government photo ID + live biometric face scan since Oct 2024), Police Check (clean record via National Crime Check, valid max 12 months, A$39 fee), licence/trade badges (e.g., UK Gas Safe) — [Airtasker Help: Badges & Verifications](https://support.airtasker.com/hc/en-gb/sections/19036200447769-Badges-Verifications); [Police Check badge](https://support.airtasker.com/hc/en-us/articles/234693667-What-is-the-Police-Check-Badge-How-do-I-get-one-); [Airtasker blog: badges](https://www.airtasker.com/blog/airtasker-badges/amp/)
- Taskers with Digital iD badges reported to have higher likelihood of being assigned and better completion rate (vendor case study, no numbers) — [Australia Post case study](https://auspost.com.au/enterprise-gov/insights-and-reports/customer-stories/airtasker-digital-identity-case-study)

**Uber driver ratings**
- Rating = average of last 500 rated trips; deactivation thresholds ~4.6 with stepwise re-entry thresholds (4.6, 4.5, 4.45 after notifications 1–3); thresholds relative to city averages — [NBER w33087 "Empirical Evidence about Driving Quality at Uber"](https://www.nber.org/system/files/working_papers/w33087/w33087.pdf); [GetRidewise](https://getridewise.com/blog/uber-lyft-driver-ratings-explained)
- Uber does not publish a universal minimum — [citizendailypost FAQ](https://www.citizendailypost.com/faq/at-what-rating-will-uber-deactivate-you)

**Effect of badges on conversion**
- Facial trustworthiness of Airbnb host photo affects price/choice (~7% price premium per trust unit; experiment n=566), while review scores did not affect price in that sample — [Ert, Fleischer & Magen 2016, Tourism Management](https://www.sciencedirect.com/science/article/abs/pii/S0261517716300127); [Academia.edu PDF](https://www.academia.edu/107783553/Trust_and_Reputation_in_the_Sharing_Economy_The_Role_of_Personal_Photos_on_Airbnb)
- In ~78,000 listings, the effect of facial trustworthiness shrinks when Superhost status is present — i.e., a badge substitutes for weaker heuristics — [ResearchGate: Overvaluation of Facial Trustworthiness](https://www.researchgate.net/publication/344884382_Understanding_the_Overvaluation_of_Facial_Trustworthiness_in_Airbnb_Host_Images)
- eBay TRS+ gives a 10% fee discount and search boost — a direct economic incentive, not only a display signal — [eBay Seller Center](https://www.ebay.com/sellercenter/protections/top-rated-program)

### Inferences
- Pattern for a new marketplace: (1) entry badge for newcomers (Upwork Rising Talent, Fiverr New) to solve cold start; (2) mid tier with volume+quality+responsiveness; (3) top tier with sustained performance and optional manual review; (4) separate *verification* badges (ID, police check, licence) that don't depend on volume.
- Mixing "relative" metrics (Fiverr Success Score vs. same price range; Uber thresholds vs. city average) with absolute floors helps counter rating inflation but reduces transparency for providers.
- Badges reduce reliance on biased heuristics (photo/face), which is an argument for prominent badges on cards.

### Gaps
- Could not fetch official Fiverr/Upwork/Etsy pages directly (network-blocked); Fiverr numbers are third-party, possibly lagging updates.
- No reliable quantitative public data found on % conversion lift from Fiverr/Upwork badges.
- Freelancehunt rating formula, verification and PLUS terms: no reliable source found in search.
- Bolt driver rating thresholds: no source found.
- Exact badge placement on search cards was not verified from screenshots; general observation (badges next to name on cards on Fiverr/Upwork/Airbnb) is common knowledge but not sourced here.

## 2. Rating inflation, multi-dimensional vs single-star ratings, review prompts/response rates, double-blind reviews

### Takeaway
Ratings on two-sided marketplaces inflate over time because raters don't want to harm counterparts; at least 35–45% of the rise is lower standards, not better quality. Platforms respond by using private feedback, relative thresholds, simultaneous-reveal reviews, and operational (non-star) metrics. Airbnb's simultaneous reveal raised review rates and slightly lowered averages, making reviews more informative.

### Cited Findings
- Feedback scores on a large online labor market rose sharply, causing top-censoring; ≥35–45% of the increase is due to raters applying lower standards; raters feel pressure to leave "above average" ratings so as not to harm the seller; similar trends in 4 other marketplaces; "reputation systems sow the seeds of their own irrelevance" — [Filippas, Horton & Golden, "Reputation Inflation", Marketing Science 2022](https://john-joseph-horton.com/papers/reputation-inflation/index.html); [SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3136473); [EurekAlert](https://www.eurekalert.org/news-releases/954537)
- The same research (on oDesk/Upwork) found private feedback (not shown to the worker) was harsher than public feedback — the rationale for private signals in JSS — [Horton paper PDF](https://john-joseph-horton.com/papers/longrun.pdf)
- Airbnb simultaneous reveal (reviews hidden until both submit or 14 days pass): increased review rates, decreased average ratings slightly, reduced correlation between host and guest ratings (less retaliation/reciprocity), faster and more accurate reviews — [Fradkin, Grewal & Holtz, Marketing Science 2021](https://pubsonline.informs.org/doi/pdf/10.1287/mksc.2021.1311); [NBER SI draft](https://conference.nber.org/confer/2015/SI2015/PRIT/Fradkin_Grewal_Holtz_Pearson.pdf); [EurekAlert](https://www.eurekalert.org/news-releases/933743)
- Contrasting lab evidence (Bolton et al.): simultaneous reveal decreased review rates in the lab — [Fradkin et al. 2021](https://pubsonline.informs.org/doi/pdf/10.1287/mksc.2021.1311)
- Incentivized first reviews on Airbnb (coupon for reviewing listings without reviews) increased review counts but produced limited market benefit — "more reviews may not help" — [Fradkin & Holtz, arXiv 2112.09783](https://arxiv.org/pdf/2112.09783); [paper PDF](https://andreyfradkin.com/assets/reviews_ir_paper.pdf)
- Uber: thresholds relative to city averages and based on last 500 trips, mitigating individual-rater noise — [NBER w33087](https://www.nber.org/system/files/working_papers/w33087/w33087.pdf)
- Etsy had to reweight 4-star reviews toward "positive" after sellers complained that 4★ (meant as "good") dragged them below the 4.8 Star Seller bar — a concrete symptom of inflation-driven thresholds — [eSeller365](https://eseller365.com/?p=30433)
- Kwork, Fiverr and Airbnb all use 4.4–4.8 floors; eBay instead uses defect/late-shipment rates — [eBay Seller Center](https://www.ebay.com/sellercenter/protections/top-rated-program)

### Inferences
- With averages clustering at 4.8–5.0, a 5-star average carries little information; better signals are: count of reviews, % of jobs completed without disputes, repeat-client rate, response time, and recency-weighted distributions.
- Multi-dimensional sub-ratings (Airbnb: cleanliness, accuracy, communication, location, check-in, value) allow negative information to be expressed without "punishing" the overall star — a plausible remedy, though I found no direct causal study in this pass.
- Double-blind (simultaneous reveal) is low-cost and evidence-backed for two-sided reviews.
- Use private feedback channels (shown only to the platform) to feed rankings/badges; display public text reviews.

### Gaps
- No dedicated academic study found in this pass comparing multi-dimensional vs single-star informativeness on gig platforms.
- No current public data on review-prompt response rates (e.g., % of Fiverr/Upwork orders that receive reviews).

## 3. Trust signals that increase hiring, choice overload, and gamification effects

### Takeaway
For newcomers, the first job/review is the biggest barrier: randomized experiments show that a single hire plus a detailed public evaluation substantially improves future employment and raises total market employment. Photos, verified ID and badges matter most when other signals are absent. Gamification can motivate but in gig work is linked to stress, perceived algorithmic injustice and gaming behaviours, especially when metrics are opaque.

### Cited Findings
- Pallais (AER 2014): 952 randomly selected oDesk data-entry workers hired; both being hired and receiving a more detailed public evaluation substantially improved subsequent employment and earnings, and increased overall market employment (not merely displacing others) — evidence of inefficient under-hiring of newcomers — [AER](https://www.aeaweb.org/articles?id=10.1257%2Faer.104.11.3565); [NBER w18917](https://www.nber.org/system/files/working_papers/w18917/w18917.pdf)
- Stanton & Thomas: agency affiliation (an intermediary certifying inexperienced workers) helps them land the first job on oDesk — [LSE Research Online](https://researchonline.lse.ac.uk/id/eprint/65160/1/__lse.ac.uk_storage_LIBRARY_Secondary_libfile_shared_repository_Content_Thomas,%20C_Landing%20the%20First%20Job_Thomas_Landing_the_First_Job.pdf)
- Host photo trustworthiness raises prices/choice probability on Airbnb — [Ert et al. 2016](https://www.sciencedirect.com/science/article/abs/pii/S0261517716300127); high-quality photos and photos with other people performed better than solo shots (320 Stockholm listings) — [EurekAlert / Ert & Fleischer 2020](https://www.eurekalert.org/news-releases/501120); [Psychology & Marketing](https://onlinelibrary.wiley.com/doi/abs/10.1002/mar.21297)
- Superhost status reduces the weight placed on facial trustworthiness — [ResearchGate](https://www.researchgate.net/publication/344884382_Understanding_the_Overvaluation_of_Facial_Trustworthiness_in_Airbnb_Host_Images)
- Verified ID badges claimed to increase assignment likelihood on Airtasker (vendor claim) — [Australia Post](https://auspost.com.au/enterprise-gov/insights-and-reports/customer-stories/airtasker-digital-identity-case-study)
- Users prefer 4.5★ from 57 reviews over 5★ from 4 reviews by ~2:1 — review count is a trust signal in itself — [Baymard: show number of ratings](https://baymard.com/blog/user-perception-of-product-ratings)

Gamification / provider-side effects:
- Gig workers: job insecurity, unsupportive algorithmic interaction and algorithmic injustice significantly contribute to burnout — [IRIS 2025 / AIS eLibrary](https://aisel.aisnet.org/iris2025/1)
- Algorithmic control framed as threat-type technostress for Uber drivers; transparency did not mitigate as hypothesized — [Crossref ITP-11-2022-0873](https://api.crossref.org/works/10.1108%2FITP-11-2022-0873)
- Uber app redesign uses game-design features (competition); drivers resist through their own "work games" to protect autonomy and earnings — [New Media & Society, SAGE](https://journals.sagepub.com/doi/full/10.1177/14614448221079028)
- Indian delivery platforms: "two-fold gamification" — workers face cognitive overload trying to satisfy opaque performance metrics — [Devdiscourse summary](https://www.devdiscourse.com/article/technology/3453315-how-indias-gig-platforms-monetize-invisible-labor)
- Counter-evidence: algorithmic management can increase promotion-focused job crafting through "gameful experiences" — [PMC11504671 (Behavioral Sciences 2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11504671/)
- Ratings as discipline mechanism for Uber drivers ("The Rating Game") — [ResearchGate](https://www.researchgate.net/publication/332114372_The_Rating_Game_The_Discipline_of_Uber's_User-Generated_Ratings)
- Fiverr forum complaints: demotions "with no explanation" (Top Rated → Level 2), level loss after inactivity, low Success Score despite no cancellations, levels lost due to scammers, false accusations of rating manipulation — [Fiverr Community: Demoted from Top Seller](https://community.fiverr.com/public/forum/boards/freelancer-lounge-sry/posts/343089-demoted-from-top-seller-to-level-2-with-no-explanation); [New system demoted me — reason unclear](https://community.fiverr.com/forums/topic/324148-new-system-has-demoted-me-to-level-1-seller-reason-is-very-unclear); [Lost level due to scammers](https://community.fiverr.com/public/forum/boards/freelancer-lounge-sry/posts/304903-lost-my-level-status-due-to-scammers); [Wrongfully accused](https://community.fiverr.com/public/forum/boards/freelancer-lounge-sry/posts/318530-wrongfully-accused) (anecdotal, not prevalence data)
- Etsy Star Seller backlash forced changes to the program — [eSeller365](https://eseller365.com/?p=30433)

### Inferences
- Design implications: cold-start tools (newcomer badge, verified ID, portfolio, "first job" guarantees/boosted placement) are justified by evidence that newcomer under-hiring is a market inefficiency, not just a fairness issue.
- Anxiety and unfair penalties concentrate where (a) formula is opaque, (b) one bad client can drop a tier, (c) inactivity is penalized, (d) no appeal process. Mitigations: show progress dashboard with each metric, grace periods, exclude disputed/fraudulent orders, explain demotions, offer appeals.
- Gaming risk rises when badges have direct economic value (fee discounts, search boost); pair with fraud detection and manual review for top tier (as Fiverr does).

### Gaps
- No rigorous study found on choice overload specifically in provider comparison (e.g., optimal number of freelancer cards per page).
- No quantitative study found isolating response-time display effect on hiring.

## 4. UX research (Baymard, NN/g) on reviews, comparison, filtering and mobile marketplace UX

### Takeaway
Users rely heavily on rating distributions and the number of ratings, actively seek negative reviews, and trust seller responses to criticism; many sites still fail to provide clickable distributions, counts on list items, or responses. NN/g emphasizes peer reviews as a top credibility factor and maintains extensive guidelines for trust and product pages.

### Cited Findings
- 53% of users actively seek out negative reviews (don't trust only positive ones); 37% factor the site's responses to negative reviews positively — [Baymard: respond to negative reviews](https://baymard.com/research-articles/respond-to-negative-user-reviews)
- Users rely on rating-distribution summaries even more than review text and instinctively click bars to filter; yet 43% of sites lack a distribution summary and 39% of those that have one aren't clickable — [Baymard: ratings distribution summary](https://baymard.com/blog/user-ratings-distribution-summary)
- Always show the number of ratings next to the average on list items (4.5★/57 preferred ~2:1 over 5★/4) — [Baymard](https://baymard.com/blog/user-perception-of-product-ratings)
- ~79–87% of sites don't respond to negative reviews (figures vary across Baymard articles) — [Baymard UX statistics](https://baymard.com/blog/ux-statistics); [Baymard respond-to-negative](https://baymard.com/research-articles/respond-to-negative-user-reviews)
- User reviews are much less important on single-brand DTC sites than on multi-seller marketplaces — [Baymard DTC](https://baymard.com/blog/user-reviews-dtc)
- NN/g: peer reviews are among the most important factors in forming impressions of an organization; users look to external review sites and are suspicious of curated reviews — [NN/g report PDF](https://media.nngroup.com/media/reports/free/Presenting_Company_Information_on_Corporate_Websites_3rd_Edition.pdf)
- NN/g Ecommerce UX Product Pages report (108 recommendations, includes review presentation) and Trust & Credibility volume (53 guidelines) — [NN/g product pages report](https://www.nngroup.com/reports/ecommerce-ux-product-pages-including-reviews/); [NN/g ecommerce series](https://www.nngroup.com/reports/ecommerce-user-experience/)

### Inferences
- Provider cards in search results should show: average rating + number of reviews, level/verification badge, response time, completed jobs, price from; profile pages should show a clickable rating distribution, negative-review filter, and provider replies to reviews.
- Because averages inflate, emphasizing counts, distributions and recency is more informative than the mean.

### Gaps
- Specific NN/g articles on marketplace provider comparison/filtering and mobile marketplace UX were not retrieved in this pass (search did not surface them; fetch blocked).
- Baymard mobile-specific statistics on filtering were not retrieved.

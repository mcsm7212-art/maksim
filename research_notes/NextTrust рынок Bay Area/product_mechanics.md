# Product Mechanics for NextTrust Marketplace (Bay Area plumbers/electricians): proven patterns, pitfalls, fairness

Research date: 2026-11-15. Many sources are help-center pages that change often. Older facts are labeled with their year. A finding without a source link is placed under Inferences or Gaps.

## 1. "Online now" / on-demand availability, live map, dispatch timeouts, ETA, emergency calls, pro location privacy

### Takeaway
In home services, the proven on-demand pattern is not a live map of moving pros like Uber's. It is an opt-in availability switch (TaskRabbit Same Day), calendar slots plus Instant Book (Thumbtack), or fixed-price instant booking (Angi). These come with response deadlines and coarse service areas. Precise live location is only shown after a booking is accepted. Uber's own map history ("phantom cars," hiding car locations in some situations) shows that a map of nearby supply is partly marketing, and it carries privacy risks for workers.

### Cited Findings
**TaskRabbit Same Day (closest analog to "online now")**
- Same Day is opt-in. Taskers must have at least 2 hours of availability set to appear in client search results for Same Day tasks. The toggle resets at midnight and must be switched on again each day. — [TaskRabbit support (via search summary)](https://support.taskrabbit.com/hc/en-us/articles/360050015351-Can-I-book-a-Same-Day-Task); [How Do I Get More Tasks?](https://support.taskrabbit.com/hc/en-us/articles/360052686412-How-Do-I-Get-More-Tasks)
- Same Day tasks are forfeited if the Tasker does not respond within one hour. Taskers can set a separate, smaller work-area map for same-day jobs. — [TaskRabbit support](https://support.taskrabbit.com/hc/en-us/articles/360052686412-How-Do-I-Get-More-Tasks)
- Client side: the client changes the date to "Today". If no Taskers are available, a same-day task cannot be booked. — [TaskRabbit support](https://support.taskrabbit.com/hc/en-us/articles/360050015351-Can-I-book-a-Same-Day-Task)

**Thumbtack Instant Book**
- Launched February 2021 in two formats. "Instant Book for Jobs" covers simpler work (TV mounting, cleaning) and shows an estimated price up front. "Instant Book for On-Site Estimates & Service Calls" covers the rest. — [Thumbtack press release, 2021](https://press.thumbtack.com/announcements/thumbtack-launches-instant-book-to-make-hiring-pros-even-easier/)
- Pros set availability on a calendar, and customers book an open slot directly. Thumbtack says instant bookings convert to hires about 2x more often than other leads. Pros complain about the cost, and they say Instant Book does not suit work that needs scoping first. Lead-time settings are the pro's main control. — [Thumbtack community](https://community.thumbtack.com/discussion/comment/3367/); [Pro suggestions for living with Instant Book](https://community.thumbtack.com/discussion/comment/7910/)
- Thumbtack repositioned as "one app for your home" (search, chat, hire, availability checked and booked in-app). — [Thumbtack guide](https://www.thumbtack.com/guide/content/the-biggest-product-update-in-our-history)

**Angi**
- Instant booking applies only to pre-priced services (cleaning, handyman, appliance repair, duct cleaning). The customer sees a "transparent, upfront price before you ever schedule". Other work goes through quote requests. — [Angi FAQ](https://www.angi.com/faq); [How Angi works](https://www.angi.com/how-it-works)
- A third-party guide reports that in early 2025 Angi moved from auto-matching to homeowners choosing which contractors receive their info. This is unverified and not from an official source. — [Block Renovation](https://www.blockrenovation.com/guides/angi-vs-thumbtack)

**Urban Company (India) instant services**
- InstaHelp launched March 2025 as "Insta Maids" and was renamed after criticism that the name undermined workers' dignity. It promises help within about 10–15 minutes and runs in Mumbai, Bengaluru, Delhi-NCR and Hyderabad. It crossed 50,000 daily bookings in under a year, and later 1M monthly delivered bookings. InstaHelp workers rely on the customer's tools and supplies, unlike UC's specialist professionals. — [UC investor relations](https://investorrelations.urbancompany.com/announcements-and-highlights/urban-company’s-instahelp-crosses-50-000-daily-bookings-in-less-than-1-year-of-launch); [UC IR, 1M monthly](https://investorrelations.urbancompany.com/announcements-and-highlights/urban-company’s-‘instahelp’-crosses-1-million-monthly-delivered-bookings); [Insta Maids is now Insta Help](https://investorrelations.urbancompany.com/announcements-and-highlights/insta-maids-is-now-insta-help)
- "UC Instant" (faster bookings of regular services) launched in September 2025 as a separate product from InstaHelp. Competition came from Snabbit and Pronto (2026). — [NewsBytes](https://www.newsbytesapp.com/news/business/urban-company-launches-uc-instant-for-faster-service-bookings/story); [The CapTable, May 2026](https://the-captable.com/2026/05/inside-urban-companys-aggressive-push-to-counter-snabbit-and-pronto)

**Uber map, dispatch and privacy (mostly older material)**
- 2015: researchers documented "phantom cars" on the rider map. Uber Help described the map as a "screen saver". Uber said the map is "as accurate as possible in the close vicinity of your location", and that in some volatile situations it hides individual car locations until a ride is requested, to protect driver safety. — [Vice](https://www.vice.com/en/article/ubers-phantom-cabs/); [Time](https://time.com/3979271/uber-phantom-cars); [WebProNews](https://www.webpronews.com/uber-denies-ghost-cars-says-it-sometimes-shows-fewer-cars-than-available)
- Academic work showed attackers can abuse the "nearby cars" feature of 20 rider apps to leak driver location data. — [Geo-locating Drivers study](https://api.sambuz.com/doc/geo-locating-drivers-a-study-of-sensitive-data-leakage-in-document-741805)
- Acceptance-rate rules: in the UK from April 2025, Uber calculates acceptance over a rolling window of the last 100 requests. Acceptance affects Uber Pro tier perks. Its "Advantage Mode" pilot requires ≥25% acceptance, <8% cancellation and a rating above 4.85. Severe penalties for low acceptance have largely ended since upfront fares. — [DMNews](https://dmnews.co.uk/?p=807); [Uber blog](https://www.uber.com/mx/en/blog/understanding-acceptance-and-cancellation-rates/); [Gridwise](https://gridwise.io/blog/uber-acceptance-rate)

**What failed**
- Homejoy (on-demand cleaning) shut down in July 2015. The CEO cited inability to raise money, with worker-classification lawsuits as the "deciding factor". Analyses add heavy discounting, which created a leaky bucket of customers, and leakage of customers to contractors off-platform. — [Fortune 2015](https://fortune.com/2015/07/17/homejoy-closing-cleaning-google/); [Backchannel](https://medium.com/backchannel/why-homejoy-failed-bb0ab39d901a); [Scaled and Failed](https://scaledandfailed.substack.com/p/issue-24-home-services)
- Handy (an app-dispatched model) survived and was acquired by ANGI Homeservices in October 2018. — [Wikipedia](https://en.wikipedia.org/wiki/Handy_Technologies)
- Frontdoor (NASDAQ: FTDR) chose remote video diagnosis by an "Expert" (2023+) over truck dispatch as its on-demand entry point. The first chat is free, followed by paid plans (prices vary across its pages). — [BusinessWire 2023](https://www.businesswire.com/news/home/20230411005205/en/Frontdoor-Revolutionizes-Home-Maintenance-and-Repair-With-New-App-That-Makes-Homeowners%E2%80%99-Lives-Easier); [Frontdoor plumbing](https://frontdoor.com/expert-solutions/plumbing)

### Inferences
- For NextTrust, "Online now" should be a daily opt-in toggle that expires automatically (as TaskRabbit's resets at midnight), so the status cannot go stale. The client should see a dot per neighborhood or zip code, or a radius such as "3 pros within ~15 min". Exact pro coordinates should never appear before acceptance. After acceptance, show live ETA tracking only while the pro is en route, and stop it on arrival.
- Do not inflate the map with idle or fake supply. The phantom-car episode was a trust scandal. Show "available now" only for pros who are opted in and have responded recently.
- Dispatch: offer an emergency job to one pro (or a small cascade) with a short accept window, and auto-escalate on timeout. Do not penalize declines with a hidden score. Use transparent rolling windows like Uber's last-100 rule, and do not punish a pro whose toggle was on but who was mid-job.
- Emergency plumbing/electrical work in practice often needs a phone or video triage step (Frontdoor pattern) before dispatch. That helps set price expectations and filters non-emergencies.
- Pitfalls from failures: subsidized discounts, worker classification (California AB5 risk if the platform controls dispatch, prices and acceptance too tightly), and leakage off the platform.

### Gaps
- No primary source found for Uber's driver accept-timer length (commonly cited as ~15 seconds, unverified), for Lyft's current map practices, or for any 2025–2026 "Uber for plumbers" startup shutdown. Searches surfaced none.
- No official Thumbtack or Angi docs on emergency-specific dispatch or same-day SLAs.
- Current Amazon Home Services status was not confirmed by any search result. Do not cite its closure without verification.

## 2. Service tiers (economy / standard / premium): eligibility, verification, downgrades

### Takeaway
Tiered programs work when eligibility is objective (rating over a recent window, volume, equipment or vehicle standards), checked automatically and reassessed on a published cadence. Inspection-based tiers (Airbnb Plus) were costly and were abandoned in favor of data-driven badges. Hard rating cutoffs with automatic ID blocks (Urban Company) caused worker protests, which makes retraining paths and appeals essential.

### Cited Findings
- **Uber Black (US):** requires a 4.85+ rating over the most recent 500 rated trips, approved models only, model year ≤5 years old, black exterior and black leather or vegan-leather interior. Ineligible drivers are reassessed after every 50 trips. Some cities use 4.80 (Tampa, Mexico). — [Uber Black requirements](https://www.uber.com/drive/services/uberblack/); [Uber Black Mexico](https://www.uber.com/mx/en/drive/services/uberblack/)
- **Urban Company tiers (Classic / Prime / Luxe):** reported rating thresholds are 4.7 for Classic and Prime and 4.8–4.85 for Luxe, raised from about 4.5 earlier. Other block triggers are a response rate below 80% and 4 cancellations a month. In 2023 the CEO said the average partner rating was 4.83 and category thresholds ranged 4.5–4.7. Partners below threshold get retraining (one example was a 3-day online course after an ID block), and persistent low ratings lead to removal. Protests took place in 2023. Partners report paying for training and kits, sometimes with loans. — [Business Today 2023](https://businesstoday.in/technology/story/urban-company-punishes-workers-when-users-cancel-services-blocks-ids-for-getting-ratings-below-48-out-of-5-385722-2023-06-15); [Inc42](https://inc42.com/buzz/amid-partner-protests-urban-company-ceo-backs-policies-claims-pre-tax-profitability-in-q1); [Al Jazeera 2024](https://www.aljazeera.com/economy/2024/3/1/how-indias-urban-company-has-soured-gig-work-for-women); [The News Minute](https://www.thenewsminute.com/news/pay-to-join-pay-to-work-inside-the-gruelling-life-of-an-urban-company-beautician)
- **Airbnb Plus (discontinued):** invite-only, verified in person against a 100+ point checklist (kitchen supplies, Wi‑Fi speed, decor), with a non-refundable application fee. Onboarding was effectively frozen from about 2020 and the program officially ended on November 6, 2023. It was replaced by "Guest Favorites", an algorithmic badge (from ratings, reviews and reliability) that is added and removed automatically. Luxe continues as an invite-only luxury tier with concierge support. — [Skift 2023](https://skift.com/2023/10/09/airbnb-officially-ending-airbnb-plus-program); [ShortTermRentalz](https://shorttermrentalz.com/news/airbnb-discontinue-plus-programme-november/); [PhocusWire](https://www.phocuswire.com/airbnb-ai-powered-guest-favorites-property-badge-update-daily); [Hostfully](https://www.hostfully.com/blog/airbnb-plus-badge/)
- **TaskRabbit Elite (current UK page):** 7 tasks a month, 40 lifetime tasks in the category, 150 lifetime tasks, top 35% performance-score ranking and no policy violations. Perks are an Elite badge, a Discord group and 1:1 business calls. Older Canadian criteria differ (≥10 tasks a month). — [TaskRabbit support UK](https://support.taskrabbit.com/hc/en-gb/articles/46260521586715-What-s-Required-to-Become-an-Elite-Tasker); [TaskRabbit support CA](https://support.taskrabbit.com/hc/en-ca/articles/360034622812-What-s-Required-to-Become-an-Elite-Tasker)
- **Fiverr levels (official):** promotion requires meeting all six metrics. Level 1 needs a success score of 5+, rating 4.4+, 80% response, 5 orders, 3 unique clients and $400 earned. Level 2 needs 7+, 4.6+, 90%, 20 orders, 10 clients and $2,000. Top Rated needs 9+, 4.7+, 90%, 40 orders, 20 clients and $10,000, plus a manual evaluation. Promotion is automatic within 24h for Levels 1–2, and levels can be lost at periodic evaluations. — [Fiverr help center](https://help.fiverr.com/hc/en-us/articles/360010560118-Achieving-levels); [Fiverr levels page](https://www.fiverr.com/cp/freelancers-levels-ratings)
- **Upwork Top Rated:** Job Success Score ≥90% (or Rising Talent) for 13 of the last 16 weeks, first project more than 90 days ago, 100% complete profile and no recent account holds. — [Upwork help](https://support.upwork.com/hc/en-us/articles/211063568-Top-Rated-and-Rising-Talent)

### Inferences
- Tier eligibility for NextTrust could follow the same pattern: a rating over the last N rated jobs (as Uber uses 500), a minimum job count, license verification (CSLB C-36 plumbing / C-10 electrical), insurance, and "home-care standards" (shoe covers, drop cloths, cleanup). The home-care standards should be verified per job through checklist questions in the client review and photo proof, not one-off inspections (the Plus lesson).
- Fair downgrades: use a "13 of 16 weeks" style sustained-window rule (Upwork), a reassessment cadence (Uber's every 50 trips), a warning plus a grace period, a free retraining path, and exclusion of ratings the pro could not control (client-caused cancellations, price complaints about platform-set prices). UC's protests show what happens when thresholds rise unilaterally and blocks are automatic.
- Tiers could describe the service package (Economy: licensed, basic; Standard: plus cleanup and warranty; Premium: plus shoe covers, drop cloths, faster arrival window, longer warranty) rather than the person's worth. This lets new but qualified pros enter Standard.
- Avoid charging pros fees to qualify for a tier (an UC criticism).

### Gaps
- No official current data on Urban Company's 2025–2026 thresholds or on its "UC kit"/equipment standards for plumbers and electricians. Amazon Home Services' "Amazon-verified pro" requirements were not found.
- Handy's tier definitions were not found.

## 3. Recommended / dynamic pricing for independent pros: what feels fair, risks

### Takeaway
Price recommendations help pros, but the gains are unequal when adoption differs. The pro must keep control (Airbnb Smart Pricing sets a min/max and is opt-in). Opaque, personalized algorithmic pricing (Uber upfront pricing) erodes trust on both sides and draws lawsuits. In California, Penal Code 396 caps emergency-period price increases at 10%, which applies directly to repair services during declared emergencies.

### Cited Findings
- **Airbnb Smart Pricing (Marketing Science, 2021):** among adopters, the nightly rate fell 5.7% while daily revenue rose 8.6%. The White–Black host revenue gap fell 71.3% among adopters ($12.16 → $3.46/day). Black hosts were about 41% less likely to adopt, so the gap across all hosts widened (to about $14.30). Researchers attribute the original gap to guest discrimination (20% lower occupancy), not to the algorithm. — [HBS Working Knowledge](https://www.library.hbs.edu/working-knowledge/white-airbnb-hosts-earn-more-can-ai-shrink-the-racial-gap); [EurekAlert](https://www.eurekalert.org/news-releases/927068); [INFORMS DOI 10.1287/mksc.2021.1295](https://pubsonline.informs.org/doi/fpi/10.1287/mksc.2021.1295)
- **Uber upfront and dynamic pricing:** a 2025 FAccT audit of UK drivers found that after dynamic pricing, pay fell, Uber's take rate rose, pay became less predictable, inequality between drivers grew and waiting time increased. — [arXiv 2506.15278](https://arxiv.org/html/2506.15278v1)
- Uber's CEO acknowledged using "behavioural patterns". Upfront pricing hides the algorithm's inputs from both riders and drivers. There are lawsuits in the EU (GDPR automated decision-making) and California (*Carranza v. Uber*), and a Columbia study alleges "algorithmic price discrimination" (Uber disputes it). — [Computer Weekly](https://www.computerweekly.com/news/366570421/Uber-CEO-admits-pricing-algorithm-uses-behavioural-patterns); [Courthouse News](https://courthousenews.com/uber-drivers-claim-personal-data-used-to-manipulate-fares/); [SF Public Press](https://sfpublicpress.org/drivers-protest-ubers-black-box-fare-system/)
- Since 2016, riders' upfront prices and driver pay have been decoupled. Uber admitted driver pay is not based on the rider's fare. — [The Drive](https://www.thedrive.com/tech/14453/uber-admits-it-doesnt-base-driver-pay-on-rider-fares.md); [Fortune 2016](https://fortune.com/2016/10/05/uber-upfront-pricing-higher/)
- The term "algorithmic wage discrimination" (Veena Dubal) describes paying different amounts for identical work. — [NELP](https://www.nelp.org/ubers-price-gouging-and-what-we-can-do-about-it/)
- **Thumbtack:** pros set their own rates. Thumbtack shows cost estimates and says it tracks millions of them so pros can compare their quotes. No official method for profile estimates was found. Lead pricing is per service, with a newer range-based option where the lead price depends on the job's estimated value. Pros complain the fee structure is not public. — [Housecall Pro](https://www.housecallpro.com/resources/what-is-thumbtack-how-it-works/); [Thumbtack community](https://community.thumbtack.com/discussion/comment/5876/)
- **Angi:** fixed upfront prices on pre-priced services. A Happiness Guarantee covers up to the purchase price. — [Angi FAQ](https://www.angi.com/faq)
- **California price gouging (PC 396):** once an emergency is declared (by the President, Governor or a city/county), prices may not rise more than 10% above pre-emergency levels. The rule covers repair and cleanup services, with a defense for increased labor or materials costs. Violations are misdemeanors (up to 1 year, $10,000). In January 2025, after the LA fires, the Attorney General charged violators and sent 650+ warning letters. — [Santa Monica](https://santamonica.gov/blog/california-s-anti-price-gouging-law-prohibits-contractors-from-over-charging-customers-for-repair-and-emergency-clean-up-services-during-declared-emergency); [Shouse Law](https://www.shouselaw.com/ca/defense/penal-code/396/); [Reed Smith](https://www.reedsmith.com/our-insights/blogs/viewpoints/102jyw5/california-quick-to-enforce-price-gouging-prohibitions-after-wildfires/)

### Inferences
- Fair design for NextTrust:
  - Make the price a recommendation with a pro-set floor and ceiling (Smart Pricing model). Show the inputs (job type, typical Bay Area range, time of day, travel distance) so it is explainable.
  - Never personalize prices by client willingness to pay, and never pay pros differently for identical jobs based on behavior.
  - Show the client both the price and the pro's payout and take rate, so the price and payout stay linked.
  - Add after-hours or emergency fees as published flat multipliers with a visible cap, and automatically disable surges during declared emergencies (PC 396).
- Proactive onboarding and defaults help adoption of pricing tools become even across pros. This addresses the Airbnb adoption-gap finding.
- Pair fixed price with scope protection: a fixed price for well-defined jobs (faucet swap), a diagnostic fee plus in-app change-order approval for open-ended jobs. This mirrors Thumbtack's split between jobs and estimates.

### Gaps
- Upwork and Fiverr rate-guidance specifics (Upwork "rate insights" for hourly rates) were not retrieved in this session.
- No source found on how Uber caps surge during California emergencies.

## 4. Verified reviews tied to completed bookings; multi-criteria ratings; job-type counters and portfolio photos

### Takeaway
Verified-booking-only reviews measurably reduce manipulation (Expedia vs. TripAdvisor) but yield fewer reviews. Multi-criteria ratings (Airbnb's 6 categories plus a separate overall rating) help both diagnosis and ranking. US law now penalizes fake reviews and review suppression (FTC rule, October 2024).

### Cited Findings
- **Mayzlin, Dover & Chevalier (AER 2014, "Promotional Reviews"):** TripAdvisor (anyone can review) vs. Expedia (only verified bookers). Small-owner independent hotels had about 10% more five-star reviews on TripAdvisor than on Expedia, relative to chains. Hotels near independent competitors had more negative TripAdvisor reviews (sabotage). Estimated about 7 fake positive reviews out of 120 for a small-owner hotel. Verification reduces manipulation, but verified sites get far fewer reviews. — [NBER w18340](https://nber.org/system/files/working_papers/w18340/w18340.pdf); [PhocusWire](https://www.phocuswire.com/TripAdvisor-responds-to-a-provocative-study-of-bogus-online-reviews)
- **Airbnb category ratings:** guests rate 1–5 on cleanliness, accuracy, check-in, communication, location and value. "Overall" is rated separately and is not an average. — [Airbnb help 1257](https://www.airbnb.ca/help/article/1257)
- In a blog keyword analysis of Inside Airbnb reviews (not peer reviewed), cleanliness was mentioned in 26.1% of reviews, communication in 22.0% and check-in in 12.3%. — [be-my-guest analysis](https://be-my-guest.pages.dev/blog/five-star-airbnb-reviews-what-1000-reviews-reveal). AirDNA (vendor) claims +0.1 star in cleanliness ≈ +$2–3 RevPAR. — [AirDNA](https://www.airdna.co/blog/hosts-guide-to-airbnb-ratings)
- Academic work weighting Airbnb's category scores by customer segment exists (about 100k reviews, text mining). — [ProQuest](https://www.proquest.com/docview/2494042706)
- **FTC Rule on Consumer Reviews and Testimonials (16 CFR Part 465):** announced August 14, 2024, effective October 21, 2024. It bans fake reviews and testimonials, using threats or intimidation to remove negative reviews, and misrepresenting reviews by suppressing unfavorable ones. Civil penalties are up to $53,088 per violation (2025 inflation adjustment), and each fake review can count separately. — [Fenwick](https://www.fenwick.com/insights/publications/the-ftc-cracks-down-on-fake-reviews-with-new-rule); [DWT](https://www.dwt.com/insights/2024/08/ftc-finalizes-rule-banning-fake-consumer-reviews); [WilmerHale PDF](https://wilmerhale.com/-/media/files/shared_content/editorial/publications/wh_publications/client_alert_pdfs/20241009-ftc-finalizes-rule-banning-fake-reviews.pdf)
- Urban Company workers say ratings are used punitively and include factors outside their control (cancellations by users). — [Business Today 2023](https://www.businesstoday.in/latest/in-focus/story/urban-company-punishes-workers-for-user-cancellations-blocks-worker-id-over-poor-rating-385830-2023-06-15)

### Inferences
- **Verified-review design:**
  - Only a paid, completed booking unlocks a review, labeled "Verified job · Faucet replacement · Oct 2026".
  - Use double-blind submission (Airbnb's simultaneous reveal; Airbnb mechanism not sourced here) to prevent retaliation.
  - Allow a public pro response.
  - Remove a review only under published policy, never because it is negative (FTC suppression ban).
- **Multi-criteria ratings:** punctuality (can be partly auto-measured from arrival vs. the window), cleanliness/home care, communication, quality of work, and price matched quote (objective: final vs. quoted). Collect "Overall" separately, as Airbnb does. Use objective signals where possible to reduce bias.
- **Job counters:** "Installed 48 faucets" should count only verified completed bookings in that job type on NextTrust. Label it "on NextTrust" so it is not mistaken for lifetime experience, and optionally show self-reported years of experience separately as "self-reported". Portfolio photos tied to a booking ID and date can carry a "from a verified job" tag, while uploaded photos are labeled "uploaded by pro".
- New pros have no reviews (cold start). Show license or insurance verification and a "New on NextTrust" label instead of a low score. Use Bayesian-smoothed averages so one review cannot dominate.

### Gaps
- No primary source fetched on Thumbtack "hired X times" or TaskRabbit per-category task counts as displayed in profiles (widely observed, not cited here).
- No peer-reviewed study found specifically on multi-criteria ratings in home services. Research on reputation inflation (e.g., Filippas et al.) was not retrieved this session.

## 5. Simple, clear labeling for game-like elements (badges, levels)

### Takeaway
Badges convey trust only when their criteria are visible and specific. Users rarely open the detailed data behind them, so the badge label itself must carry the meaning. Ambiguous earning rules lead users to interpret badges differently.

### Cited Findings
- A study of Facebook group badges found that unclear earning rules led core members to understand the same badge differently, and some users cared more about the author and content than the badge. — [Game Developer](https://www.gamedeveloper.com/design/the-application-of-gamification-in-community-badge-design)
- eBay trust-badge redesign research (AMA, April 2026): redesigning a badge changes what it "means" to consumers and changes seller behavior. Detailed seller ratings were available on profile pages but very few buyers viewed them. — [AMA](https://www.ama.org/2026/04/21/when-a-trust-badge-changes-what-sellers-do/)
- Digital badges influence the perception of non-holders (WSU, n=404). — [WSU](https://business.wsu.edu/dividend/2020/08/01/kunter-gunasti-research-aug-2020)
- A badge's motivational impact depends on how people appraise it (Self-Determination Theory, IJHCS 2018). — [White Rose eprints](https://eprints.whiterose.ac.uk/139776/)
- Badges communicate system norms, and most users find only some badge types motivating (Antin & Churchill). — [Antin & Churchill PDF](https://pedley-smith.uk/wp-content/uploads/2017/02/antin-churchill.pdf)
- Fiverr publishes exact numeric criteria per level in a table. TaskRabbit and Upwork publish Elite and Top Rated criteria in help centers. — [Fiverr](https://www.fiverr.com/cp/freelancers-levels-ratings); [TaskRabbit](https://support.taskrabbit.com/hc/en-gb/articles/46260521586715-What-s-Required-to-Become-an-Elite-Tasker); [Upwork](https://support.upwork.com/hc/en-us/articles/211063568-Top-Rated-and-Rising-Talent)

### Inferences
- Labeling rules for NextTrust:
  - Use plain-language labels that state the fact, not a game name ("Licensed & insured – verified Oct 2026" rather than "Gold Shield").
  - Every badge gets a one-line tap-to-explain ("Why this badge: 4.8+ average over last 50 jobs, 0 no-shows").
  - Limit badges to about 3 visible ones.
  - Show the date verified and the expiry.
  - Use the same wording for clients and pros.
  - Show pros their progress toward the next level with exact numbers (Fiverr model).
  - Avoid levels that look like rank or worth for clients. Prefer service-package tiers.
- Older, less tech-savvy Bay Area homeowners benefit from text-plus-icon (never icon alone) and from consistent color semantics (green = verified, not "level").

### Gaps
- No marketplace-specific comprehension or eye-tracking study of trust-badge labels was found. Nielsen Norman Group-style usability guidance on badges was not retrieved.

const {chromium,devices}=require('playwright');const {execSync}=require('child_process');
const B=process.env.BASE||'http://localhost:3100',D=__dirname+'/out-';const errs=[];
const sql=q=>execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -tAc "${q}"`).toString().trim();
async function code(email){for(let i=0;i<20;i++){const r=await (await fetch('http://127.0.0.1:54324/api/v1/search?query=to:'+encodeURIComponent(email))).json();
  if(r.messages&&r.messages.length){const m=await (await fetch('http://127.0.0.1:54324/api/v1/message/'+r.messages[0].ID)).json();const c=(m.Text||m.HTML).match(/\b(\d{6})\b/);if(c)return c[1]}await new Promise(r=>setTimeout(r,500))}throw new Error('no mail for '+email)}
async function user(b,email,name,mobile){const c=await b.newContext(mobile?{...devices['iPhone 13']}:{viewport:{width:1200,height:900}});const p=await c.newPage();
  p.on('pageerror',e=>errs.push(email+' '+p.url()+' '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL_CONNECTION_FAILED|ERR_NAME_NOT_RESOLVED/.test(m.text()))errs.push(email+' console '+m.text().slice(0,200))}); // map tiles cannot load without internet in the test box
  await p.goto(B+'/login');await p.fill('input[type=email]',email);if(name)await p.fill('input[autocomplete=name]',name);await p.check('input[name=agree]');await p.click('text=Email me a sign-in code');
  await p.waitForSelector('input[autocomplete=one-time-code]');await p.fill('input[autocomplete=one-time-code]',await code(email));await p.click('button:has-text("Sign in")');await p.waitForURL(/account/);return p}
const step=s=>console.log('✓',s);
const IMG=n=>__dirname+'/'+n+'.jpg';
async function avatar(p){await p.setInputFiles('.figfield input[type=file]',IMG('face'));await p.waitForFunction(()=>(document.querySelector('input[name=photo_override]')?.value||'').length>5,null,{timeout:90000})}
(async()=>{sql('truncate auth.users, public.companies, public.notifications cascade');sql("insert into storage.buckets (id, name, public) values ('photos','photos',true) on conflict do nothing");await fetch('http://127.0.0.1:54324/api/v1/messages',{method:'DELETE'});const b=await chromium.launch();try{
 // company owner
 const o=await user(b,'owner@test.local','Dana Owner');step('owner signed in by email code');
 await o.goto(B+'/join/company');await o.fill('input[name=name]','Peninsula Pipe Co');await o.fill('input[name=license]','1045001');await o.fill('input[name=city]','Redwood City');await o.fill('textarea[name=about]','Plumbing company for test.');
 await o.check('input[name=agree]');await o.click('button:has-text("Register company")');await o.waitForURL(/business/);step('company registered → business page');
 const a=await user(b,'admin@test.local','Ada Admin');sql("update profiles set role='admin' where id=(select id from auth.users where email='admin@test.local')");
 await a.goto(B+'/admin');await a.click('form:has-text("Peninsula Pipe Co") button:has-text("Approve")');await a.waitForTimeout(800);
 if(sql("select status from companies")!=='verified')throw new Error('admin approve company failed');step('admin approved the company with a button');
 await o.reload();await o.click('button:has-text("New technician invite")');await o.waitForSelector('code');const inv=(await o.textContent('code')).trim();step('invite link '+inv);
 // technician
 const t=await user(b,'tech@test.local','Tom Tech',true);await t.goto(inv);await t.waitForURL(/join\/pro\?invite/);
 await t.fill('input[name=name]','Tom Tech');await avatar(t);await t.check('input[name=svc_faucet-replacement]');await t.check('input[name=agree]');await t.click('button:has-text("Create my profile")');await t.waitForURL(/account/);step('technician joined through invite');
 // solo pro
 const s=await user(b,'solo@test.local','Max Solo');await s.goto(B+'/join/pro');await s.fill('input[name=name]','Max Solo');await s.fill('input[name=license]','1121547');await avatar(s);
 await s.fill('textarea[name=experience]','Nine years as a plumber, four on my own.');await s.fill('input[name=skills]','Water heaters, Repipes, Leak detection');
 await s.setInputFiles('.drop input[multiple] >> nth=0',[IMG('w1'),IMG('w2')]);await s.waitForFunction(()=>document.querySelectorAll('input[name=work_url]').length===2);
 await s.check('input[name=svc_faucet-replacement]');await s.fill('input[name=price_faucet-replacement]','400');await s.check('input[name=day_0]',{force:true});await s.check('input[name=day_6]',{force:true});await s.fill('input[name=start_4]','13:00');
 await s.check('input[name=agree]');await s.click('button:has-text("Create my profile")');await s.waitForURL(/account/);if(sql("select to_char(start_time,'HH24:MI')||'-'||to_char(end_time,'HH24:MI') from availability_rules a join pros p on p.id=a.pro_id where p.display_name='Max Solo' and weekday=4")!=='13:00-18:00')throw new Error('Thursday afternoon hours not saved');
 if(sql("select count(*) from availability_rules a join pros p on p.id=a.pro_id where p.display_name='Max Solo'")!=='7')throw new Error('7 working days expected');step('solo pro registered (own hours per day: Thursday 13:00–18:00)');
 for(const n of ['Tom Tech','Max Solo']){await a.goto(B+'/admin');const f=a.locator(`form:has-text("${n}")`);await f.locator('input[name=id_ok]').check();await f.locator('input[name=license_ok]').check();await f.locator('button:has-text("Approve")').click();await a.waitForTimeout(800)}
 if(sql("select count(*) from pros where status='verified' and id_verified")!=='2')throw new Error('admin approve pros failed');step('admin approved both pros (license + ID)');
 await s.goto(B+'/account/profile');await s.fill('textarea[name=experience]','Ten years now. Tankless heaters are my favorite.');await s.click('button:has-text("Save changes")');await s.waitForSelector('text=Saved');
 if(!sql("select experience from pros where display_name='Max Solo'").startsWith('Ten years'))throw new Error('profile edit not saved');step('pro edited profile');
 if(sql("select count(*) from pro_services p join pros x on x.id=p.pro_id where x.display_name='Max Solo' and active")!=='1')throw new Error('services lost on edit');
 await s.goto(B+'/account');await s.selectOption('select[name=area]','Redwood City');await s.click('button:has-text("Go online for 4 h")');await s.waitForSelector('text=Online in Redwood City');
 const v=await b.newPage();await v.goto(B+'/online?city=Redwood%20City');await v.waitForSelector('text=Max Solo');if(!(await v.textContent('main')).includes('now in Redwood City'))throw new Error('map city missing');await v.screenshot({path:D+'e_online.png',fullPage:true});await v.close();step('pro went online in Redwood City → shown on the map');
 // calendar: import busy time (tomorrow 8-12) hides slots; feed link exports jobs
 await s.goto(B+'/account/calendar');await s.fill('input[name=url]','http://127.0.0.1:54398/basic.ics');await s.click('button:has-text("Save and sync")');await s.waitForSelector('text=1 busy blocks');
 const v2=await b.newPage();await v2.goto(B+'/pro/max-solo');const slotsTxt=await v2.textContent('.slots');await v2.close();
 if(/Tomorrow8:00 AM|8:00 AMTomorrow|10:00 AMTomorrow/.test(slotsTxt.replace(/\s+/g,'')))throw new Error('busy slot still offered: '+slotsTxt);
 step('imported busy time hides tomorrow morning slots');
 await s.click('button:has-text("Create my calendar link")');await s.waitForSelector('code');const feedUrl=(await s.textContent('code')).trim();
 console.log('  techs in company:',sql("select count(*) from pros where company_id is not null"));
 // client: request a visit
 const c=await user(b,'client@test.local','Anna Client',true);step('client signed in');
 await c.goto(B+'/companies');await c.click('text=Peninsula Pipe Co');await c.click('text=Request a visit');await c.selectOption('select[name=svc]','faucet-replacement');
 await c.fill('input[name=address]','100 Main St, Redwood City');await c.click('button:has-text("Request a visit")');await c.waitForURL(/orders\/[0-9a-f-]{36}/);await c.goto(B+'/account');
 if(!(await c.content()).includes('The office will assign a technician'))throw new Error('no pending assignment shown');step('client requested a visit, waits for assignment');
 // office assigns
 await o.goto(B+'/business');await o.selectOption('select[name=pro]',{label:'Tom Tech'});await o.fill('input[name=time]','2030-03-04T10:00');await o.click('button:has-text("Save")');await o.waitForTimeout(800);
 await c.reload();const ct=await c.content();if(!ct.includes('Tom Tech')||!ct.includes('assigned by the office'))throw new Error('assigned tech not visible to client');step('office assigned Tom → client sees him + notification');
 await c.screenshot({path:D+'e_client.png',fullPage:true});
 // day board: second visit request assigned for today, then moved through statuses from the board
 await c.goto(B+'/company/peninsula-pipe-co');await c.click('text=Request a visit');await c.fill('input[name=address]','200 Elm St, San Carlos');await c.click('button:has-text("Request a visit")');await c.waitForURL(/orders\/[0-9a-f-]{36}/);await c.goto(B+'/account');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date());
 await o.goto(B+'/business/board');await o.waitForSelector('text=Waiting for a technician (1)');
 await o.selectOption('.formcard select[name=pro]',{label:'Tom Tech'});await o.fill('.formcard input[name=time]',today+'T23:00');await o.click('button:has-text("Assign")');await o.waitForTimeout(900);
 await o.reload();const col=o.locator('.bcol:has-text("Tom Tech")');if(!(await col.textContent()).includes('200 Elm St'))throw new Error('job not in Tom column');
 await col.locator('button:has-text("On the way")').click();await o.waitForTimeout(800);await o.reload();
 if(!(await o.locator('.bcol:has-text("Tom Tech")').textContent()).includes('Start'))throw new Error('status not updated on board');
 await o.screenshot({path:D+'e_board.png',fullPage:true});step('day board: office assigned today job to Tom, marked him on the way');
 // client books solo pro by slot
 await c.goto(B+'/search?svc=faucet-replacement');await c.click('text=Max Solo');await c.waitForURL(/pro\//);if((await c.locator('.works img').count())!==2)throw new Error('work photos not on public page');step('public page shows real photo + 2 work photos');await c.screenshot({path:D+'e_pro.png',fullPage:true});
 await c.click('button:has-text("Message Max")');await c.waitForURL(/messages\//);await c.fill('textarea[name=body]','Hi Max, can you replace a kitchen faucet this week?');await c.click('button:has-text("Send")');await c.waitForTimeout(800);
 await s.goto(B+'/messages');await s.click('text=Anna Client');await s.waitForSelector('text=kitchen faucet');await s.fill('textarea[name=body]','Yes, pick any open time on my page.');await s.click('button:text-is("Send")');await s.waitForTimeout(800);
 await c.reload();await c.waitForSelector('text=pick any open time');
 await c.setInputFiles('label[aria-label="Attach photos"] input',IMG('w1'));await c.waitForSelector('input[name=photo_url]',{state:'attached'});await c.fill('textarea[name=body]','This is the faucet.');await c.click('button:has-text("Send")');await c.waitForTimeout(1000);
 await s.reload();await s.waitForSelector('img[alt=Photo]');step('client and pro chatted, photo sent in chat');await c.screenshot({path:D+'e_chat.png',fullPage:true});
 await c.goto(B+'/pro/max-solo?svc=faucet-replacement');await c.click('.slots a >> nth=0');await c.fill('input[name=address]','100 Main St, Redwood City');await c.click('button:has-text("Send booking request")');await c.waitForURL(/orders\/[0-9a-f-]{36}/);await c.goto(B+'/account');step('client booked solo pro for a slot');
 // pro flows job to done
 await s.goto(B+'/account');await s.click('button:has-text("Confirm")');await s.waitForTimeout(700);
 await s.setInputFiles('text=Add BEFORE photos >> xpath=ancestor::label//input',IMG('w1'));await s.waitForSelector('form:has(input[name=kind][value=before]) input[name=work_url]',{state:'attached'});await s.click('button:has-text("Save job photos")');await s.waitForTimeout(700);
 for(const l of ['Start','Done']){await s.click(`button:has-text("${l}")`);await s.waitForTimeout(700)}
 await s.setInputFiles('text=Add AFTER photos >> xpath=ancestor::label//input',IMG('w2'));await s.waitForSelector('form:has(input[name=kind][value=after]) input[name=work_url]',{state:'attached'});await s.click('button:has-text("Save job photos")');await s.waitForTimeout(700);
 console.log('  photos:',sql("select string_agg(kind||'='||n, ', ') from (select kind, count(*) n from pro_photos group by kind) x"));
 console.log('  status:',sql("select status from bookings where pro_id=(select id from pros where display_name='Max Solo')"),' jobs counter:',sql("select jobs_count from pro_services ps join pros p on p.id=ps.pro_id where p.display_name='Max Solo' and service_id='faucet-replacement'"));step('pro confirmed → started → done');
 const feed=await (await fetch(feedUrl)).text();if(!feed.includes('BEGIN:VEVENT')||!feed.includes('Faucet replacement'))throw new Error('feed missing job: '+feed.slice(0,300));step('calendar feed exports the job for Google/Apple');
 // client reviews
 await c.goto(B+'/account');if((await c.locator('img[alt="before photo"]').count())!==1||(await c.locator('img[alt="after photo"]').count())!==1)throw new Error('client does not see before/after');step('client sees before/after photos of the job');
 await c.screenshot({path:D+'e_client2.png',fullPage:true});await c.selectOption('select[name=cleanliness]','4');await c.fill('textarea[name=body]','On time, clean, fair price.');await c.click('button:has-text("Post review")');await c.waitForTimeout(800);
 console.log('  review:',sql("select author_name||' '||cleanliness||' '||service_id from reviews"));step('client posted review');
 await s.goto(B+'/account');await s.click('button:has-text("Save rating")');await s.waitForTimeout(800);
 if(sql("select publish_at<=now() from reviews")!=='t')throw new Error('review not published after both rated');step('pro rated client → review published');
 await s.goto(B+'/account/reviews');await s.fill('textarea[name=body]','Thank you Anna! Glad the new faucet works well.');await s.click('button:has-text("Post reply")');await s.waitForTimeout(1500);await s.screenshot({path:D+'e_reply.png',fullPage:true});await s.waitForSelector('.reply:has-text("Glad the new faucet")',{timeout:5000});
 await c.goto(B+'/pro/max-solo');await c.waitForSelector('text=Glad the new faucet');step('reply shows on the public page');
 if(sql("select count(*) from profiles where terms_version is null")!=='0')throw new Error('someone signed in without accepting the terms');
 await c.goto(B+'/terms');if(await c.locator('.legal h3').count()<15)throw new Error('terms page');await c.goto(B+'/privacy');if(await c.locator('.legal h3').count()<8)throw new Error('privacy page');
 step('every account accepted the Terms at sign-in; Terms and Privacy pages open');
 await a.goto(B+'/pro/max-solo');await a.click('button.helpful');await a.waitForTimeout(1200);
 if(sql("select helpful_count from reviews")!=='1')throw new Error('helpful vote not counted');
 await c.goto(B+'/pro/max-solo');if(await c.locator('button.helpful').count()!==1)throw new Error('author should still see the button');
 await a.goto(B+'/admin');await a.waitForSelector('text=Suspicious review patterns');await a.goto(B+'/rules');await a.waitForSelector('text=How the rating works');
 step('a reader marks the review helpful (count 1); admin has the suspicious-pattern queue; rules explain the rating');
 // invoice: pro bills the job (labor from the booking + a material line with 9.375% tax), sends, client opens, pro marks paid
 await s.goto(B+'/account');await s.click('a:has-text("Create invoice")');await s.waitForURL(/invoice\/new/);
 await s.click('button:has-text("+ Material")');const rows=s.locator('.invline');await rows.nth(1).locator('input').nth(0).fill('Moen faucet');await rows.nth(1).locator('input').nth(2).fill('150');
 await s.fill('input[name=tax_rate]','9.375');await s.fill('textarea[name=payment]','Zelle to Max Solo');await s.click('button:has-text("Send to client")');await s.waitForURL(/invoice\/[0-9a-f-]{36}$/);
 const total=sql("select total from invoices");if(total!==String((400+150+14.06).toFixed(2)))throw new Error('invoice total '+total);
 await c.goto(B+'/account');await c.click('a:has-text("Invoice NF-")');await c.waitForSelector('text=Zelle to Max Solo');await c.screenshot({path:D+'e_invoice.png',fullPage:true});
 await s.reload();await s.click('button:has-text("Mark as paid")');await s.waitForTimeout(800);if(sql("select status from invoices")!=='paid')throw new Error('not paid');
 step('invoice: pro billed $'+total+', client opened it, pro marked it paid');
 // business card: short address, QR, vCard, print sheet
 await s.goto(B+'/account/card');await s.fill('input[name=handle]','search');await s.click('button:has-text("Save address")');await s.waitForSelector('text=reserved by the site');
 await s.fill('input[name=handle]','max');await s.click('button:has-text("Save address")');await s.waitForSelector('text=old address keeps working');
 await s.fill('input[name=phone]','(650) 555-0100');await s.click('button:has-text("Save phone")');await s.waitForTimeout(800);await s.reload();
 await s.screenshot({path:D+'e_card.png',fullPage:true});
 const v3=await b.newPage();await v3.goto(B+'/max');if(!(await v3.textContent('h1')).includes('Max Solo'))throw new Error('short address does not show the pro');
 await v3.goto(B+'/max-solo');if(!v3.url().endsWith('/max'))throw new Error('old address did not redirect: '+v3.url());
 const qr=await (await fetch(B+'/api/qr/max')).text();if(!qr.startsWith('<svg'))throw new Error('qr not svg');
 const vc=await (await fetch(B+'/api/vcard/max')).text();if(!vc.includes('FN:Max Solo')||vc.includes('555-0100'))throw new Error('vcard wrong: '+vc);
 const pp=await s.context().newPage();await pp.goto(B+'/account/card/print');if((await pp.locator('.sheet .bcard').count())!==20)throw new Error('print sheet must have 20 card sides');await pp.screenshot({path:D+'e_print.png',fullPage:true});await pp.close();await v3.close();
 step('business card: short address /max, old address redirects, QR, vCard (no private phone), print sheet of 10');await c.screenshot({path:D+'e_pro2.png',fullPage:true});
 // social: save, hide, my pros, posts, likes, recommendations, popular
 const tom=sql("select slug from pros where display_name='Tom Tech'");
 await c.goto(B+'/max');await c.click('button[aria-pressed=false]:has-text("Save")');await c.waitForSelector('button[aria-pressed=true]:has-text("Following")');
 if(sql("select count(*) from pro_saves where status='saved'")!=='1')throw new Error('save not stored');
 await c.goto(B+'/pro/'+tom);await c.click('button:has-text("Hide")');await c.waitForSelector('text=Hidden from your search');
 await c.goto(B+'/search?svc=faucet-replacement');const sr=await c.textContent('main');if(sr.includes('Tom Tech')||!sr.includes('Max Solo')||!sr.includes('My pro'))throw new Error('search did not hide/flag pros');
 step('client saved Max (♥ My pro in search) and hid Tom from search');
 await c.goto(B+'/my-pros');const mp=await c.textContent('main');if(!mp.includes('Max Solo')||!mp.includes('Book again')||!mp.includes('Tom Tech'))throw new Error('my pros page wrong');await c.screenshot({path:D+'e_mypros.png',fullPage:true});
 step('My pros: saved Max with "Book again", Tom under Hidden');
 await s.goto(B+'/feed');await s.fill('textarea[name=body]','Swapped an old faucet for a new pull-down in Redwood City.');await s.setInputFiles('.drop input >> nth=0',IMG('w1'));await s.waitForSelector('input[name=work_url]',{state:'attached'});
 await s.click('button:has-text("Post")');await s.waitForSelector('text=Posted.');if(sql("select count(*) from posts")!=='1')throw new Error('post not stored');
 step('pro posted new work with a photo');
 await c.goto(B+'/feed?tab=following');await c.waitForSelector('text=pull-down in Redwood City');await c.click('.post button[aria-label=Like]');await c.waitForSelector('.post button[aria-pressed=true]');
 if(sql("select count(*) from post_likes")!=='1')throw new Error('like not stored');if(sql("select count(*) from notifications where body like 'New post from%'")!=='1')throw new Error('saver not notified of post');
 await c.screenshot({path:D+'e_feed.png',fullPage:true});step('client saw the post in "My pros" feed, liked it, got a notification');
 await s.goto(B+'/pro/'+tom);await s.fill('input[name=note]','Great with water heaters, always on time.');await s.click('button:has-text("Recommend")');await s.waitForSelector('input[name=note]',{state:'detached'});
 await s.goto(B+'/max');await s.waitForSelector('.colls >> text=Tom Tech');if(!(await s.textContent('main')).includes('1 people saved you')&&!(await s.textContent('main')).includes('people saved you'))throw new Error('owner save count missing');
 if(sql("select count(*) from notifications where body like '%recommends you%'")!=='1')throw new Error('colleague not notified');
 step('Max recommended Tom → shown on Max page, Tom notified');
 // community: comments, questions & answers, the pros Lounge, colleague chat
 await c.goto(B+'/feed');await c.fill('.post .cmt-form input[name=body]','Nice clean job!');await c.click('.post .cmt-form button');await c.waitForSelector('.post .cmt >> text=Nice clean job!');
 if(sql("select count(*) from notifications where body like '%commented on your post.'")!=='1')throw new Error('pro not notified about comment');
 step('client commented on a post → pro notified');
 await c.goto(B+'/questions');await c.fill('input[name=title]','Why does my faucet drip at night?');await c.fill('textarea[name=body]','Kitchen faucet, 10 years old.');await c.selectOption('select[name=trade]','plumbing');
 await c.click('.askbox button:has-text("Ask the pros")');await c.waitForURL(/questions\/[0-9a-f-]{36}/);const qurl=c.url();
 await t.goto(qurl);await t.fill('textarea[name=body]','Worn cartridge most likely. A new one is $20-40; replacing it takes about an hour.');await t.click('button:has-text("Post answer")');await t.waitForSelector('.ans >> text=Worn cartridge');
 await c.goto(qurl);await c.click('.ans button:has-text("Best answer")');await c.waitForSelector('.ans.best');
 await s.goto(qurl);await s.click('.ans button:has-text("Helpful")');await s.waitForSelector('.ans button[aria-pressed=true]');
 if(sql("select count(*) from notifications where body like '%picked your answer as the best.'")!=='1'||sql("select count(*) from answer_votes")!=='1')throw new Error('best/vote not stored');
 await c.screenshot({path:D+'e_question.png',fullPage:true});
 step('client asked a question → Tom answered, client picked best, Max upvoted');
 await s.goto(B+'/lounge');await s.check('input[name=kind][value=handoff]');await s.fill('textarea[name=body]','Water heater swap in Belmont Friday, I am booked. Who can take it?');await s.click('button:has-text("Post")');await s.waitForSelector('.lpost >> text=Water heater swap');
 await t.goto(B+'/lounge');await t.fill('.lpost .cmt-form input[name=body]','I can take it.');await t.click('.lpost .cmt-form button');await t.waitForSelector('.lreplies >> text=I can take it.');
 await c.goto(B+'/lounge');if(!(await c.textContent('main')).includes('only for verified pros')&&!(await c.textContent('main')).includes('for verified pros'))throw new Error('client saw the lounge');
 await t.goto(B+'/lounge');await t.click('.lpost button:has-text("Message")');await t.waitForURL(/messages\/[0-9a-f-]{36}/);await t.fill('textarea[name=body]','Call me 650-555-0199');await t.click('form button:has-text("Send")');await t.waitForSelector('text=Call me 650-555-0199');
 for(let i=0;i<20&&!sql("select flagged from messages where body like 'Call me%'");i++)await t.waitForTimeout(300);
 if(sql("select flagged from messages where body like 'Call me%'")!=='f')throw new Error('colleague chat should not warn about phone numbers');
 await s.goto(B+'/messages');await s.waitForSelector('text=Colleague');
 step('Lounge: Max passed a job, Tom replied and messaged him (colleague chat), client cannot see the Lounge');
 // taking jobs, schedule, colleague settings, neighbors, construction
 await s.goto(B+'/account/work');await s.click('button:has-text("Pause new jobs")');await s.waitForSelector('text=Not taking new jobs');
 await c.goto(B+'/max');await c.waitForSelector('text=is not taking new jobs right now');if(await c.locator('.pricebox2 a:has-text("Pick a time")').count())throw new Error('paused pro still bookable');
 {const nc=await user(b,'newc@test.local','Nora New');let asked='';nc.on('dialog',d=>{asked=d.message();d.accept();});await nc.goto(B+'/max');await nc.click('.pricebox2 button:has-text("Message")');await nc.waitForURL(/messages\//);
  if(!/not taking new jobs/.test(asked))throw new Error('new client not warned before writing');
  const n0=sql("select count(*) from notifications n join pros p on p.id=n.user_id where p.slug='max'");
  await nc.fill('textarea[name=body]','Hello, can you come next week?');await nc.click('button:has-text("Send")');await nc.waitForSelector('text=Hello, can you come next week?');
  if(sql("select quiet::text from conversations c join pros p on p.id=c.pro_id join auth.users u on u.id=c.client_id where p.slug='max' and u.email='newc@test.local'")!=='true')throw new Error('chat from a new client is not quiet');
  if(sql("select count(*) from notifications n join pros p on p.id=n.user_id where p.slug='max'")!==n0)throw new Error('the pro was notified while paused');
  await s.goto(B+'/account');await s.waitForSelector('.desk-top.off');await s.waitForSelector('.desk-msg:has-text("while paused")');}
 await s.click('.desk-top button:has-text("Take jobs")');await s.waitForSelector('.desk-top.on');
 await s.goto(B+'/account/work');await s.fill('input[name=yelp]','https://evil.example/biz/max');await s.click('form:has(input[name=yelp]) button');await s.waitForSelector('form:has(input[name=yelp]) .err');
 await s.fill('input[name=yelp]','https://www.yelp.com/biz/max-solo-plumbing-redwood-city');await s.click('form:has(input[name=yelp]) button');await s.waitForSelector('form:has(input[name=yelp]) .okmsg');
 await c.goto(B+'/max');await c.waitForSelector('.ext-box a:has-text("Yelp")');if(!/has not checked/.test(await c.textContent('.ext-box')))throw new Error('unchecked links shown as checked');
 await a.goto(B+'/admin');await a.click('.lic-q:has-text("Max Solo") button:has-text("These are theirs")');for(let i=0;i<20&&sql("select (ext_checked_at is not null)::text from pros where slug='max'")!=='true';i++)await a.waitForTimeout(300);
 await c.goto(B+'/max');if(!/NovaFides checked that these profiles/.test(await c.textContent('.ext-box')))throw new Error('links not marked checked after the admin');
 await s.goto(B+'/account/work');await s.check('input[name=on_6]');await s.selectOption('select[name=start_6]','09:00');await s.selectOption('select[name=end_6]','13:00');await s.click('button:has-text("Save schedule")');await s.waitForSelector('text=Schedule saved.');
 if(sql("select start_time||'-'||end_time from availability_rules a join pros p on p.id=a.pro_id where p.display_name='Max Solo' and weekday=6")!=='09:00:00-13:00:00')throw new Error('schedule not saved');
 step('Max paused new jobs (no Book button for clients), resumed, set Saturday 9-13');
 await t.goto(B+'/max');await t.click('button:has-text("Add to my colleagues")');await t.waitForSelector('button:has-text("My colleague")');
 await s.goto(B+'/account/work');await s.check('input[name=mode][value=off]');await s.click('form:has(input[name=mode]) button:has-text("Save")');await s.waitForTimeout(800);
 await t.goto(B+'/messages');await t.click('text=Max Solo');await t.fill('textarea[name=body]','Are you free Friday?');await t.click('form button:has-text("Send")');await t.waitForSelector('text=does not take messages from colleagues');
 await s.goto(B+'/account/work');await s.check('input[name=mode][value=all]');await s.click('form:has(input[name=mode]) button:has-text("Save")');await s.waitForTimeout(800);
 if(sql("select colleague_chat from pros where display_name='Max Solo'")!=='all')throw new Error('chat setting not saved');
 step('Tom added Max to colleagues; Max turned colleague chat off → Tom could not write; turned back on');
 await c.goto(B+'/neighbors');await c.check('input[name=open]');await c.selectOption('select[name=city]','San Carlos');await c.check('input[name=scope][value=city]');await c.check('input[name=interest][value=electrical]');await c.click('button:has-text("Save")');await c.waitForSelector('text=Neighbors you can talk to');
 await o.goto(B+'/neighbors');await o.check('input[name=open]');await o.selectOption('select[name=city]','San Carlos');await o.check('input[name=scope][value=bayarea]');await o.click('button:has-text("Save")');await o.waitForSelector('.card.bk >> text=Anna C.');
 await o.click('.card.bk:has-text("Anna C.") button:has-text("Message")');await o.waitForURL(/messages\/[0-9a-f-]{36}/);const nurl=o.url();await o.fill('textarea[name=body]','Hi neighbor! Who did your panel?');await o.click('form button:has-text("Send")');await o.waitForSelector('text=Who did your panel?');
 await c.waitForTimeout(1000);await c.goto(B+'/messages');if(!(await c.locator('text=Neighbor').count())){await c.waitForTimeout(1500);await c.reload();}await c.waitForSelector('.badge:has-text("Neighbor")');
 await c.goto(B+'/neighbors');await c.click('.card.bk:has-text("Dana O.") button:has-text("Block")');await c.waitForSelector('text=Unblock');
 await o.goto(nurl);await o.fill('textarea[name=body]','Hello?');await o.click('form button:has-text("Send")');await o.waitForSelector('text=no longer available');
 step('neighbors: Anna (San Carlos, electrical) and Dana (whole Bay Area) found each other, chatted; Anna blocked Dana');
 await c.goto(B+'/');if(!(await c.textContent('main')).includes('Construction'))throw new Error('construction trade missing on home');
 const cs=await c.goto(B+'/search?trade=construction');if(!(await c.textContent('main')).includes('Construction'))throw new Error('construction search');
 step('construction is a fourth trade on the home page and in search');
 // photo search: pro shows job photos, client searches by photo, client can hide photos of their home
 await s.goto(B+'/account');await s.click('button:has-text("Show these photos on my page")');await s.waitForSelector('button:has-text("Shown on my page")');
 if(sql("select count(*) from pro_photos where public and service_id='faucet-replacement'")!=='2')throw new Error('job photos not public/tagged: '+sql("select count(*) from pro_photos where public"));
 await c.goto(B+'/');await c.click('.sbox-cam');await c.waitForURL(/\/photo/);await c.setInputFiles('.photosearch input[type=file]',IMG('w2'));await c.waitForURL(/\/photo\?svc=/);
 await c.waitForSelector('text=Pros who do this');const ph=await c.textContent('main');if(!ph.includes('Max Solo')||!ph.includes('Water is leaking')||!ph.includes('Looks urgent'))throw new Error('photo search results wrong');
 if((await c.locator('.jobstrip img').count())<1)throw new Error('no job photos in photo search');await c.screenshot({path:D+'e_photo.png',fullPage:true});
 await c.goto(B+'/account');await c.click('button:has-text("Keep them private")');await c.waitForTimeout(800);
 if(sql("select count(*) from pro_photos where public")!=='0')throw new Error('client could not hide job photos');
 step('photo search: Max showed his before/after photos, client found him by a photo of the leak; client then hid the photos of their home');
 // find a part: Max records the part he installed; a client photographs the same part
 await s.goto(B+'/account');await s.fill('.partform input[name=brand]','Grohe');await s.fill('.partform input[name=part_no]','47 678 000');await s.fill('.partform input[name=name]','Pressure balance shower cartridge');
 await s.click('.partform button:has-text("Add part")');await s.waitForSelector('text=47 678 000');
 await c.goto(B+'/photo?mode=part');await c.setInputFiles('.photosearch input[type=file]',IMG('w1'));await c.waitForSelector('text=Pros who installed this part');
 const pt=await c.textContent('main');if(!pt.includes('47678000')||!pt.includes('Max Solo')||!pt.includes('Same part number'))throw new Error('part search wrong');
 const az=await c.getAttribute('a:has-text("Amazon")','href');if(!az.includes('tag=testtag-20'))throw new Error('amazon link has no partner tag: '+az);
 await c.screenshot({path:D+'e_part.png',fullPage:true});
 step('find a part: Max recorded a Grohe 47678000; client photographed a part → part number, Amazon link with partner tag, Max as installer');
 // order flow: quote in chat → accept → pick time → visit → done → client confirms → problem → admin answers
 const conv=sql("select c.id from conversations c join pros p on p.id=c.pro_id where p.display_name='Max Solo' and c.client_id=(select id from auth.users where email='client@test.local')");
 await s.goto(B+'/messages/'+conv);await s.click('button:has-text("Send a quote")');await s.fill('.quoteform input[name=title]','Replace shower cartridge');
 await s.fill('.quoteform .qline >> nth=0 >> input[name=label]','Labor');await s.fill('.quoteform .qline >> nth=0 >> input[name=amount]','250');
 await s.fill('.quoteform .qline >> nth=1 >> input[name=label]','Grohe cartridge 47678000');await s.fill('.quoteform .qline >> nth=1 >> input[name=amount]','120');
 await s.fill('.quoteform textarea[name=includes]','Parts, cleanup, 1-year warranty on labor');await s.click('.quoteform button:has-text("Send quote")');await s.waitForSelector('text=Quote sent.');
 await c.goto(B+'/messages/'+conv);await c.waitForSelector('.quote >> text=$370.00');await c.click('.quote button:has-text("Accept quote")');await c.waitForURL(/\/orders\/[0-9a-f-]{36}/);const ourl=c.url();
 await c.waitForSelector('text=Price agreed: pick a time');await c.check('.slotpick input >> nth=0');await c.fill('input[name=address]','200 Elm St, San Carlos');await c.click('button:has-text("Send time to the pro")');await c.waitForSelector('text=Waiting for the pro to confirm the visit');
 await s.goto(ourl);for(const b of ['Confirm visit','On my way','Start work','Job done']){await s.click('button:has-text("'+b+'")');await s.waitForTimeout(700);}
 await s.waitForSelector('text=Waiting for the client to confirm');
 await c.goto(ourl);await c.click('button:has-text("Confirm the job is complete")');await c.waitForSelector('text=Job complete');
 if(sql("select price_estimate::int||' '||(client_confirmed_at is not null) from bookings where id='"+ourl.split('/').pop()+"'")!=='370 true')throw new Error('order not stored right');
 await c.click('summary:has-text("Report a problem")');await c.selectOption('select[name=kind]','quality');await c.fill('details textarea[name=body]','The shower still drips a little.');await c.click('button:has-text("Send to NovaFides")');await c.waitForSelector('text=Under review');
 await a.goto(B+'/admin');await a.fill('form:has-text("The shower still drips") textarea[name=resolution]','Max will come back on Friday to fix it at no charge.');await a.click('form:has-text("The shower still drips") button:has-text("Mark answered")');await a.waitForTimeout(800);
 await c.goto(ourl);await c.waitForSelector('text=Max will come back on Friday');await c.screenshot({path:D+'e_order.png',fullPage:true});
 step('order: Max sent a $370 quote in chat → client accepted, picked a time → visit → done → client confirmed → problem answered by admin');
 if(!(await c.locator('.bnav a[href="/orders"]').isVisible()))throw new Error('bottom nav missing on phone');
 await c.goto(B+'/max');await c.click('summary:has-text("What NovaFides checked")');await c.waitForSelector('text=is active in the official CSLB database');
 await s.goto(B+'/max');await s.click('button:has-text("Pin to my page")');await s.waitForSelector('.badge:has-text("Pinned")');
 step('phone bottom menu, "What NovaFides checked" panel, pinned post');
 // client path: search in 3 languages, estimate with photos to one pro, "I have the same", demo profile, My home, phone header
 await c.goto(B+'/search?q='+encodeURIComponent('течёт под раковиной'));await c.waitForSelector('text=What needs doing?');await c.waitForSelector('a.chip:has-text("Under-sink leak repair")');
 await c.goto(B+'/search');await c.fill('.sbox input.inp','inodoro tapado');await c.click('.sbox-go');await c.waitForURL(/svc=clogged-toilet/);
 await c.goto(B+'/');await c.fill('.sbox input.inp','leak under sink');await c.fill('.sbox-loc input','94063');await c.click('.sbox-go');await c.waitForURL(/loc=94063/);await c.waitForSelector('text=Redwood City');
 await c.goto(B+'/search');if((await c.inputValue('.sbox-loc input'))!=='94063')throw new Error('location not remembered');
 const tr=await c.goto(B+'/search?today=1');if(tr.status()!==200)throw new Error('today filter');
 await c.goto(B+'/');await c.waitForSelector('.qa2-card');await c.goto(B+'/questions');await c.waitForSelector('a[href^="/questions/"] .qcount, a[href^="/questions/"]');
 step('search with a ZIP: pros near Redwood City first, the place is remembered; open-hours-today filter');
 // sort + filters are remembered; compare; saved search; client project confirmed by the pro
 await c.goto(B+'/search?sf=1');await c.selectOption('.sctl-sort select','rating');await c.waitForURL(/sort=rating/);
 await c.click('.sctl-f > summary');await c.click('.sctl-f .chip:has-text("License checked")');await c.waitForURL(/f=lic/);
 await c.goto(B+'/search');if((await c.inputValue('.sctl-sort select'))!=='rating')throw new Error('sort not remembered');
 await a.goto(B+'/search?sf=1');await a.waitForSelector('.cmp-t');if(await a.locator('.cmp-t input').count()<2)throw new Error('need 2 pros to compare');
 await a.check('.cmp-t input >> nth=0');await a.check('.cmp-t input >> nth=1');await a.click('.cmp-bar a.btn');await a.waitForURL(/\/compare\?p=/);await a.waitForSelector('.cmp-table');
 await a.evaluate(()=>localStorage.removeItem('nf_cmp'));
 await c.goto(B+'/search?trade=plumbing&sf=1');await c.click('.savesearch button');await c.waitForSelector('.savesearch:has-text("Stop alerts")');
 if(sql("select count(*) from saved_searches")!=='1')throw new Error('saved search not stored');
 step('search: sort and filters remembered, 2 pros compared side by side, alert about new plumbers saved');
 const maxId=sql("select id from pros where display_name='Max Solo'");
 await c.goto(B+'/projects/new?pro='+maxId);await c.setInputFiles('.drop input >> nth=0',IMG('w2'));await c.waitForSelector('input[name=photo_url]',{state:'attached'});
 await c.fill('textarea[name=body]','New faucet in our kitchen, done in an hour.');await c.click('button:has-text("Send to the pro")');await c.waitForURL(/\/client\/.*sent=1/);
 await s.goto(B+'/account/projects');await s.click('button.confirm-proj');await s.waitForTimeout(1000);
 if(sql("select status from client_projects")!=='confirmed')throw new Error('project not confirmed');
 await c.goto(B+'/feed');await c.waitForSelector('.proj:has-text("New faucet in our kitchen")');
 await c.goto(B+'/'+sql("select slug from pros where id='"+maxId+"'"));await c.waitForSelector('.proj');
 step('client shared a project with photos → Max confirmed it was his job → it shows in the feed and on his page');
 await c.goto(B+'/callback?pro=max');await c.fill('input[name=phone]','(650) 555-0177');await c.fill('textarea[name=problem]','Water heater leaks from the bottom.');await c.click('form.formcard button.btn');await c.waitForURL(/\/messages\/.*sent=callback/);
 if(!sql("select body from messages where body like '%Call-back request%'").includes('555-0177'))throw new Error('callback not in chat');
 await o.goto(B+'/business');await o.click('summary:has-text("Add a technician")');await o.fill('details input[name=name]','Joe Prefill');await o.selectOption('details select[name=trade]','electrical');await o.fill('details input[name=area]','San Carlos');await o.click('button:has-text("Create the invite link")');await o.waitForTimeout(1000);
 if(sql("select prefill->>'name' from company_invites where prefill->>'name' is not null")!=='Joe Prefill')throw new Error('prefilled invite missing');
 await o.waitForSelector('.card:has-text("Joe Prefill") a[href^="sms:"]');
 step('client asked Max for a call back (phone + time in the chat); the office added a technician with a prefilled profile and an SMS/email link');
 await s.goto(B+'/account/profile');await s.click('button:has-text("Add your own service")');await s.fill('input[name=custom_name]','Water softener service');await s.fill('input[name=custom_price]','450');await s.click('button:has-text("Save changes")');await s.waitForTimeout(1500);
 if(sql("select name||' '||price::int from pro_custom_services")!=='Water softener service 450')throw new Error('own service not saved');
 await s.goto(B+'/max');await s.waitForSelector('.prow:has-text("Water softener service")');
 step('pro added an own service (not in the list) with a price → it shows on his page');
 // draft: typed text survives a reload and a language switch; trash clears a field; non-English text is flagged
 await s.goto(B+'/account/profile');await s.waitForTimeout(900);await s.fill('textarea[name=bio]','Тест черновика');await s.waitForTimeout(300);await s.waitForSelector('.en-warn');
 await s.reload();await s.waitForFunction(()=>document.querySelector('textarea[name=bio]').value==='Тест черновика');await s.waitForSelector('.draft-note');
 await s.goto(B+'/lang?to=es&back=%2Faccount%2Fprofile');await s.waitForFunction(()=>document.querySelector('textarea[name=bio]')?.value==='Тест черновика');await s.goto(B+'/lang?to=en&back=%2Faccount%2Fprofile');
 await s.hover('textarea[name=bio]');await s.click('textarea[name=bio] + .clear-btn');if((await s.inputValue('textarea[name=bio]'))!=='')throw new Error('trash did not clear');
 await s.click('.draft-note button');await s.waitForLoadState('load');await s.waitForTimeout(800);
 step('profile form keeps typed text after reload and language switch, trash button clears a field, non-English text is flagged');
 await s.goto(B+'/account/profile');await s.waitForSelector('.sa-map.leaflet-container');await s.fill('.sa-bar input','Redwood City');await s.click('.sa-bar button:has-text("Find")');await s.waitForFunction(()=>(document.querySelector('input[name=service_polygon]')?.value||'').length>10);
 await s.click('.sa button:has-text("Bigger area")');await s.click('.sa button:has-text("Bigger area")');await s.waitForTimeout(800);await s.locator('.sa-mid').first().click({timeout:60000});await s.waitForFunction(()=>JSON.parse(document.querySelector('input[name=service_polygon]').value).length===9);
 await s.click('button:has-text("Save changes")');await s.waitForTimeout(1500);
 if(sql("select jsonb_array_length(service_polygon)||' '||(service_radius_mi>10)::text from pros where display_name='Max Solo'")!=='9 true')throw new Error('service area not saved: '+sql("select service_polygon, service_radius_mi from pros where display_name='Max Solo'"));
 await c.goto(B+'/search?sf=1&loc=94061');await c.waitForSelector('.why:has-text("Works in your area")');
 await c.goto(B+'/max');await c.waitForSelector('.sa.ro .leaflet-container');
 step('Max drew his service area on the map (Redwood City, made bigger, added a corner point) → a client in 94061 sees “Works in your area”; the area shows on his page');
 for(const u of ['/robots.txt','/sitemap.xml','/manifest.webmanifest','/services','/services/faucet-replacement','/near/redwood-city']){const r=await c.goto(B+u);if(r.status()!==200)throw new Error('page '+u+' '+r.status())}
 await c.goto(B+'/max');if(!(await c.content()).includes('application/ld+json'))throw new Error('no structured data on pro page');
 step('Google: robots, sitemap, app manifest, service and city pages, structured data on the pro page');
 const nl=await user(b,'nolic@test.local','Nick Nolicense');await nl.goto(B+'/join/pro');await nl.fill('input[name=name]','Nick Nolicense');await avatar(nl);
 await nl.click('details.grp >> nth=0');await nl.check('input[name=svc_faucet-replacement]');await nl.click('summary:has-text("Water Heaters")');await nl.check('input[name=svc_tank-water-heater-replacement]');
 if(!(await nl.locator('.sv-row.lic').count()))throw new Error('no red rows without license');const ks=nl.locator('.sv-row:has(input[name=svc_kitchen-sink-installation])');if(await ks.evaluate(e=>e.classList.contains('lic')))throw new Error('kitchen sink $775 red without license');await nl.fill('input[name=price_kitchen-sink-installation]','1200');if(!(await ks.evaluate(e=>e.classList.contains('lic'))))throw new Error('$1200 not red');await nl.fill('input[name=price_kitchen-sink-installation]','775');if(await ks.evaluate(e=>e.classList.contains('lic')))throw new Error('$775 still red');await nl.check('input[name=agree]');if(!(await nl.locator('.submit-wrap.blocked').count()))throw new Error('create not blocked with red jobs');await nl.hover('.submit-wrap');await nl.waitForSelector('.submit-tip:visible:has-text("CSLB license")');
 await nl.uncheck('input[name=svc_tank-water-heater-replacement]');await nl.click('button:has-text("Create my profile")');await nl.waitForURL(/account/);
 if(sql("select coalesce(license_no,'none') from pros where display_name='Nick Nolicense'")!=='none')throw new Error('unlicensed pro not created');
 step('a plumber without a license can join for jobs under $1,000; a kitchen sink at $775 is fine, $1,200 turns red; with a water heater replacement ticked the button is dimmed and says why');
 {const mn=await user(b,'mini@test.local','Mia Minimal');await mn.goto(B+'/join/pro');await mn.fill('input[name=name]','Mia Minimal');
  await mn.waitForSelector('.submit-wrap.blocked',{timeout:10000});if(await mn.locator('.draft-note').count())throw new Error('fresh form says a draft was kept');
  await mn.hover('.submit-wrap');await mn.waitForSelector('.submit-tip:visible');if(!/Terms of Use/.test(await mn.textContent('.submit-tip')))throw new Error('tooltip does not say what is missing');
  await mn.locator('.sa-map').scrollIntoViewIfNeeded();const box=await mn.locator('.sa-map').boundingBox();await mn.mouse.click(box.x+box.width/2,box.y+box.height/2);await mn.waitForFunction(()=>(document.querySelector('input[name=service_polygon]')?.value||'').length>10);
  await mn.setInputFiles('.drop input[multiple]',IMG('face'));await mn.waitForSelector('input[name=work_url]',{state:'attached',timeout:60000});
  await mn.reload();await mn.waitForFunction(()=>(document.querySelector('input[name=service_polygon]')?.value||'').length>10,null,{timeout:15000});await mn.waitForSelector('input[name=work_url]',{state:'attached',timeout:15000});
  await mn.fill('textarea[name=bio]','Soy plomero con 10 años de experiencia');await mn.hover('.submit-wrap');await mn.waitForSelector('.submit-tip:visible:has-text("English")');await mn.fill('textarea[name=bio]','');
  await mn.click('.trade-req .add-own');await mn.fill('.trade-req input','жопа');await mn.waitForSelector('.trade-req .err');
  if(await mn.locator('.trade-req button:has-text("Add")').isEnabled())throw new Error('rude trade can be added');
  await mn.fill('.trade-req input','Roofing');await mn.click('.trade-req button:has-text("Add")');
  await mn.waitForSelector('.own-trade input:checked');await mn.click('.custom-svcs button:has-text("Add a category")');await mn.fill('.cs-cat-h input','Repairs');
  await mn.click('.cs-cat button:has-text("Add a job")');await mn.fill('.cs-cat input[name=custom_name]','Sh1t removal');await mn.waitForSelector('.submit-wrap.blocked');await mn.hover('.submit-wrap');await mn.waitForSelector('.submit-tip:visible:has-text("rude")');
  await mn.fill('.cs-cat input[name=custom_name]','Shingle repair');await mn.fill('.cs-cat input[name=custom_price]','450');
  for(let i=0;i<20&&sql("select count(*) from trade_requests where name='Roofing'")!=='1';i++)await mn.waitForTimeout(250);
  if(sql("select count(*) from trade_requests where name='Roofing'")!=='1')throw new Error('own trade not sent to the admin list');
  await mn.check('input[name=agree]');await mn.waitForSelector('.submit-wrap:not(.blocked)',{timeout:5000});
  if(!/only jobs under \$1,000/.test(await mn.textContent('label.agree')))throw new Error('agree text still claims a license');
  await mn.click('button:has-text("Create my profile")');await mn.waitForURL(/account/);await mn.waitForSelector('.todo-card');
  if(sql("select trade||'/'||custom_trade from pros where display_name='Mia Minimal'")!=='other/Roofing')throw new Error('own trade not saved');
  if(sql("select count(*) from pro_custom_services c join pros p on p.id=c.pro_id where p.display_name='Mia Minimal' and c.category='Repairs' and c.name='Shingle repair' and c.price=450")!=='1')throw new Error('own category job not saved');
  {const sl=sql("select slug from pros where display_name='Mia Minimal'");await mn.goto(B+'/pro/'+sl);const tx=await mn.textContent('body');if(!/ROOFING/.test(tx)||!/Repairs/.test(tx)||!/Shingle repair/.test(tx))throw new Error('own trade or category not on the page');}
  if(sql("select count(*) from pros p where display_name='Mia Minimal' and photo_url is null and service_polygon is not null and exists(select 1 from pro_photos w where w.pro_id=p.id)")!=='1')throw new Error('minimal pro not saved with map and work photo');
  step('a pro signs up with just a name and trade: the button is dimmed and explains what is missing; map and work photos survive a reload; account lists what to fill in later; added an own trade (Roofing) with a category and a job, shown on the page; a rude trade name and a rude job name are refused; a Spanish bio blocks the button (English only)');}
 {sql("delete from pro_contacts");await s.goto(B+'/friends?tab=friends&find=Tom');await s.click('.fr-row:has-text("Tom Tech") button:has-text("Add")');await s.waitForSelector('.fr-row:has-text("Tom Tech") button:has-text("Cancel")');
  await t.goto(B+'/friends?tab=friends');await t.click('.fr-box:has-text("Friend requests") .fr-row:has-text("Max Solo") button');await t.waitForSelector('.fr-box:not(.pulse-green) .fr-row:has-text("Max Solo") button[title="Message"]');
  await t.goto(B+'/friends');await t.fill('textarea[name=body]','Private note for my pro friends');await t.click('form:has(textarea[name=body]) button:has-text("Post")');await t.waitForSelector('.post:has-text("Private note for my pro friends") .badge:has-text("Friends only")');
  await s.goto(B+'/friends');await s.waitForSelector('.post:has-text("Private note for my pro friends")');
  const ts=sql("select slug from pros where display_name='Tom Tech'");await c.goto(B+'/'+ts);if(/Private note for my pro friends/.test(await c.textContent('body')))throw new Error('a client sees a friends-only post');
  await c.goto(B+'/feed');if(/Private note for my pro friends/.test(await c.textContent('body')))throw new Error('friends-only post in the public feed');
  step('pro friends: Max adds Tom, Tom adds back → friends; Tom\u2019s friends-only post is in Max\u2019s feed and hidden from clients');}
 {sql("delete from pro_helpers");sql("delete from pro_tips");
  const tr0=sql("select trade||'|'||status from pros where display_name='Tom Tech'").split('|'),mt=sql("select trade from pros where display_name='Max Solo'");
  await s.goto(B+'/friends?tab=helpers&find=Tom');await s.click('.fr-row:has-text("Tom Tech") button:has-text("Add to my list")');await s.waitForSelector('.fr-helper:has-text("Tom Tech")');
  await s.fill('.fr-helper:has-text("Tom Tech") input[name=note]','Good with panels');await s.click('.fr-helper:has-text("Tom Tech") .fr-note button');await s.waitForTimeout(800);
  if(sql("select note from pro_helpers")!=='Good with panels')throw new Error('helper note not saved');
  await t.goto(B+'/friends?tab=helpers');if(/Max Solo/.test(await t.textContent('.fr-main')))throw new Error('helper list is not private');
  sql("update pros set status='verified' where display_name in ('Max Solo','Tom Tech')");sql("update pros set trade='"+mt+"' where display_name='Tom Tech'");
  await s.goto(B+'/friends?tab=stores');await s.click('.fr-add summary');await s.fill('.fr-tipform input[name=name]','Ferguson Plumbing Supply');await s.fill('.fr-tipform input[name=place]','San Carlos');await s.fill('.fr-tipform textarea[name=note]','Opens at 6am, the pro counter is fast');await s.click('.fr-tipform button');
  await s.waitForSelector('.fr-tip:has-text("Ferguson Plumbing Supply")');
  await s.click('.fr-add summary');await s.fill('.fr-tipform input[name=name]','Хороший магазин');await s.click('.fr-tipform button');await s.waitForSelector('.err:has-text("English")');
  await t.goto(B+'/friends?tab=stores');await t.click('.fr-tip:has-text("Ferguson Plumbing Supply") button[title="I recommend it too"]');await t.waitForSelector('.fr-tip:has-text("Ferguson Plumbing Supply") button[aria-pressed=true]');
  if(sql("select count(*) from pro_tip_votes")!=='1')throw new Error('vote not saved');
  await t.goto(B+'/friends?tab=tools');if(/Ferguson/.test(await t.textContent('.fr-main')))throw new Error('a store is in the tools list');
  sql("update pros set trade='"+(mt==='electrical'?'plumbing':'electrical')+"' where display_name='Tom Tech'");
  await t.goto(B+'/friends?tab=stores');if(/Ferguson/.test(await t.textContent('.fr-main')))throw new Error('another trade sees the tip');
  sql("update pros set trade='"+tr0[0]+"', status='"+tr0[1]+"' where display_name='Tom Tech'");
  step('pros I need: Max keeps Tom in a private list with a note; a store tip is seen and voted by a pro of the same trade, hidden from another trade');}
 {const fk=await user(b,'fake@test.local','Fred Fake');await fk.goto(B+'/join/pro');await fk.fill('input[name=name]','Fred Fake');await fk.fill('input[name=license]','8246895');
  await fk.click('summary:has-text("Water Heaters")');await fk.waitForSelector('.lic-review input[name=license_review]:checked',{timeout:15000});await fk.check('input[name=svc_tank-water-heater-replacement]');await fk.check('input[name=svc_faucet-replacement]');await fk.check('input[name=agree]');
  if(!(await fk.locator('.sv-row.wait:has(input[name=svc_tank-water-heater-replacement])').count()))throw new Error('permit job not marked waiting');
  await fk.waitForSelector('.submit-wrap:not(.blocked)');await fk.click('button:has-text("Create my profile")');await fk.waitForURL(/account/);
  if(sql("select status from pros where display_name='Fred Fake'")!=='pending')throw new Error('typed license made the profile public');
  if(sql("select active::text||'/'||needs_approval::text from pro_services s join pros p on p.id=s.pro_id where p.display_name='Fred Fake' and s.service_id='tank-water-heater-replacement'")!=='false/true')throw new Error('permit job should wait for the license approval');
  const ad=await user(b,'admin@test.local');await ad.goto(B+'/admin');const fm=ad.locator('form:has-text("Fred Fake")');await fm.locator('input[name=id_ok]').check();await fm.locator('input[name=license_ok]').uncheck();await fm.locator('button:has-text("Approve")').first().click();
  for(let i=0;i<20&&sql("select status from pros where display_name='Fred Fake'")!=='verified';i++)await ad.waitForTimeout(300);
  if(sql("select coalesce(license_no,'none')||'/'||license_status from pros where display_name='Fred Fake'")!=='none/none')throw new Error('unconfirmed license kept');
  if(sql("select count(*) from pro_services s join pros p on p.id=s.pro_id where p.display_name='Fred Fake' and s.active and s.service_id='tank-water-heater-replacement'")!=='0')throw new Error('license job still active');
  if(sql("select count(*) from pro_services s join pros p on p.id=s.pro_id where p.display_name='Fred Fake' and s.active and s.service_id='faucet-replacement'")!=='1')throw new Error('small job removed');
  await ad.goto(B+'/admin');await ad.setInputFiles('input[type=file][accept*=csv]',__dirname+'/cslb-sample.csv');await ad.waitForSelector('.okmsg:has-text("Done")',{timeout:60000});
  if(sql("select count(*) from cslb_licenses")!=='4'||sql("select classes::text from cslb_licenses where license_no='1121547'")!=='{C36,C10}')throw new Error('CSLB list not uploaded right');
  if(sql("select license_auto->>'result' from pros where display_name='Max Solo'")!=='ok')throw new Error('pros not checked again after the upload');
  await fk.goto(B+'/account/profile');await fk.waitForSelector('.lic-box');await fk.fill('.lic-box input[name=license]','12ab');await fk.click('.lic-box button');await fk.waitForSelector('.lic-box .err');
  await fk.fill('.lic-box input[name=license]','1121547');await fk.click('.lic-box button');await fk.waitForSelector('.lic-box .err:has-text("SOLO MAX")');
  if(sql("select coalesce(license_no,'none') from pros where display_name='Fred Fake'")!=='none')throw new Error('someone else\'s license was accepted');
  {const nn=await user(b,'nm@test.local','Nina Other');await nn.goto(B+'/join/pro');await nn.fill('input[name=name]','Nina Other');await nn.fill('input[name=license]','1121547');
   await nn.waitForSelector('.name-bad');if(await nn.locator('.lic-review').count())throw new Error('manual check offered for someone else\'s license');}
  await fk.fill('.lic-box input[name=license]','1076543');await fk.click('.lic-box button');await fk.waitForSelector('.lic-box.pending');
  if(sql("select license_no||'/'||license_status from pros where display_name='Fred Fake'")!=='1076543/pending')throw new Error('corrected license not pending');
  if(sql("select license_auto->>'result' from pros where display_name='Fred Fake'")!=='ok')throw new Error('corrected license not found in the CSLB list');await fk.waitForSelector('.lic-box .cslb-mark.ok');
  await ad.goto(B+'/admin');await ad.waitForSelector('.lic-q:has-text("Fred Fake") .cslb-mark.ok');
  await ad.goto(B+'/admin');await ad.click('.lic-q:has-text("Fred Fake") button:has-text("Confirm")');
  for(let i=0;i<20&&sql("select license_status from pros where display_name='Fred Fake'")!=='verified';i++)await ad.waitForTimeout(300);
  if(sql("select license_status from pros where display_name='Fred Fake'")!=='verified')throw new Error('admin confirm failed');
  step('a made-up license number does not count: not confirmed automatically → offered to the admin for a manual check, the permit job is saved as waiting; the profile waits for the check; the admin does not confirm it → number removed, permit job switched off, small jobs stay; the pro sends a corrected number from the account (bad format refused) → admin uploads the CSLB list (CSV) → the number is found automatically (green mark for the pro and the admin) → admin confirms it; a license in someone else\'s name is refused in the account and flagged in the sign-up form');}
 step('search: Russian phrase → "what needs doing?" with the right job; Spanish phrase → straight to the job');
 await c.goto(B+'/book?pro=max&estimate=1&svc=faucet-replacement');await c.selectOption('select[name=city]','Redwood City');await c.fill('textarea[name=notes]','Kitchen faucet drips under the handle.');
 await c.setInputFiles('.drop input >> nth=0',IMG('w1'));await c.waitForSelector('input[name=photo_url]',{state:'attached'});
 const sum=await c.textContent('.summary');if(!sum.includes('Max Solo')||!sum.includes('Redwood City'))throw new Error('summary wrong: '+sum);
 await c.click('button:has-text("Send to Max")');await c.waitForURL(/messages\/[0-9a-f-]{36}\?sent=estimate/);await c.waitForSelector('text=Kitchen faucet drips');await c.waitForSelector('img[alt=Photo]');
 step('estimate: one pro, city only, photo attached, summary showed who gets it → lands in chat with the pro');
 await c.goto(B+'/feed');await c.click('.post a:has-text("I have the same") >> nth=0');await c.waitForURL(/ref=post/);await c.waitForSelector('.refwork');
 await c.selectOption('select[name=city]','San Carlos');await c.fill('textarea[name=notes]','Same problem in my kitchen.');await c.click('button:has-text("Send to Max")');await c.waitForURL(/sent=estimate/);
 if(sql("select count(*) from work_requests where post_id is not null")!=='1')throw new Error('work request not stored');
 await s.goto(B+'/feed');await s.waitForSelector('text=1 requests from this work');
 step('"I have the same" under Max\'s post → request with the example attached; Max sees 1 request from this work');
 const tomSlug=sql("select slug from pros where display_name='Tom Tech'");sql("update pros set is_demo=true where display_name='Tom Tech'");
 await c.goto(B+'/pro/'+tomSlug);await c.waitForSelector('text=Demo profile');await c.click('.stick3 a:has-text("Pick a time")');await c.waitForURL(/\/book\?pro=/);if(!(await c.locator('button.btn:has-text("Send booking request")').isDisabled()))throw new Error('demo profile bookable');sql("update pros set is_demo=false where display_name='Tom Tech'");
 await c.goto(B+'/my-home');await c.waitForSelector('.homejob >> text=Grohe');await c.waitForSelector('.homejob a:has-text("Call again")');
 if(!(await c.locator('.more summary').isVisible())||(await c.locator('.bar .nav').isVisible()))throw new Error('phone header not compact');
 await c.screenshot({path:D+'e_home.png',fullPage:true});
 step('demo profile cannot be booked; My home lists the finished job with the installed Grohe part; phone header is one row with ⋯');
 // full-height photo: background removed in the browser, glow colour from clothes
 if(process.env.MP_MODEL)await s.route(/storage\.googleapis\.com/,r=>r.fulfill({path:process.env.MP_MODEL,contentType:'application/octet-stream'}));
 await s.goto(B+'/account/profile');await s.setInputFiles('.figfield input[type=file]',process.env.ROOM_IMG);await s.waitForSelector('.figfield .fig-sil.cut img',{timeout:120000});
 await s.waitForFunction(()=>(document.querySelector('input[name=figure_url]')?.value||'').includes('/figure-'),null,{timeout:60000});
 const before=await s.inputValue('input[name=figure_url]');await s.click('.figfield .flipbtn >> nth=1');await s.waitForFunction((b)=>{const v=document.querySelector('input[name=figure_url]')?.value;return v&&v!==b},before,{timeout:60000});
 {const b2=await s.inputValue('input[name=figure_url]');await s.click('.figfield .cropbtn');await s.waitForSelector('.crop-r');const h=await s.locator('.crop-h.e').boundingBox();await s.mouse.move(h.x+h.width/2,h.y+h.height/2);await s.mouse.down();await s.mouse.move(h.x-40,h.y+h.height/2,{steps:5});await s.mouse.up();
 await s.click('.crop button:has-text("Crop")');await s.waitForFunction((b)=>{const v=document.querySelector('input[name=figure_url]')?.value;return v&&v!==b},b2,{timeout:60000});if(!(await s.locator('.figfield .fshadow').count()))throw new Error('no floor shadow under the figure');}
 await s.goto(B+'/lang?to=ru&back=%2Faccount%2Fprofile');await s.waitForFunction(()=>(document.querySelector('input[name=figure_url]')?.value||'').includes('/figure-'),null,{timeout:20000});await s.goto(B+'/lang?to=en&back=%2Faccount%2Fprofile');await s.waitForFunction(()=>(document.querySelector('input[name=figure_url]')?.value||'').includes('/figure-'),null,{timeout:20000});
 await s.click('button:has-text("Preview my page")');await s.waitForSelector('.pv .pname:has-text("Max Solo")');await s.waitForSelector('.pv .fig-sil.cut img');await s.click('.pv button:has-text("Back to editing")');
 await s.click('button:has-text("Save changes")');await s.waitForTimeout(1500);
 const fa=sql("select coalesce(figure_url,'')||' '||accent from pros where display_name='Max Solo'");if(!fa.includes('/figure-')||!sql("select photo_url from pros where display_name='Max Solo'").includes('/avatar-')||!/#[0-9A-F]{6}$/.test(fa))throw new Error('figure not saved: '+fa);
 await s.goto(B+'/max');await s.waitForSelector('.figcol .fig-sil.cut img');
 step('pro added a full-height photo in the profile form → background removed in the browser, mirrored, cropped with the frame (shadow under the shoes), kept after a language switch, previewed, saved; glow colour '+fa.slice(-7)+' from clothes, shown on the page');
 // urgent calls
 await s.goto(B+'/account');if(!(await s.textContent('main')).includes('go offline')){await s.click('button:has-text("Go online for 4 h")');await s.waitForSelector('text=go offline')}
 await s.fill('input[name=fee]','75');await s.click('button:has-text("I take urgent calls")');await s.waitForSelector('text=Urgent call-out: +$75');
 sql("update pros set online_until=now()+interval '2 hours' where display_name='Tom Tech'");
 await c.goto(B+'/');const hu=await c.textContent('.urg-stats a[href="/online?urgent=1"] b');const ho=await c.textContent('.urg-stats a[href="/online"] b');if(hu!=='1'||ho!=='2')throw new Error('home urgent counts wrong: '+hu+' '+ho);
 await c.click('.urgent a.btn');await c.waitForURL(/urgent=1/);const ou=await c.textContent('main');if(!ou.includes('Max Solo')||ou.includes('Tom Tech'))throw new Error('urgent list wrong');
 await c.screenshot({path:D+'e_urgent.png',fullPage:true});
 await c.goto(B+'/max');await c.waitForSelector('text=+$75 call-out');
 step('Max takes urgent calls (+$75) → home count, urgent map shows only Max, badge on his page');
 sql("update pros set online_until=null");await c.goto(B+'/');const hm=await c.textContent('main');if(!hm.includes('Popular now')||!hm.includes('Max Solo'))throw new Error('popular section missing');step('home page: Max in Popular now (offline pros with recent jobs)');
 await o.goto(B+'/business');await o.screenshot({path:D+'e_business.png',fullPage:true});
}catch(e){console.log('FAIL',e.message)}console.log(errs.length?errs.join('\n'):'no page errors');await b.close()})();

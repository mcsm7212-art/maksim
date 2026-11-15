const {chromium,devices}=require('playwright');const {execSync}=require('child_process');
const B=process.env.BASE||'http://localhost:3100',D=__dirname+'/out-';const errs=[];
const sql=q=>execSync(`PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -tAc "${q}"`).toString().trim();
async function code(email){for(let i=0;i<20;i++){const r=await (await fetch('http://127.0.0.1:54324/api/v1/search?query=to:'+encodeURIComponent(email))).json();
  if(r.messages&&r.messages.length){const m=await (await fetch('http://127.0.0.1:54324/api/v1/message/'+r.messages[0].ID)).json();const c=(m.Text||m.HTML).match(/\b(\d{6})\b/);if(c)return c[1]}await new Promise(r=>setTimeout(r,500))}throw new Error('no mail for '+email)}
async function user(b,email,name,mobile){const c=await b.newContext(mobile?{...devices['iPhone 13']}:{viewport:{width:1200,height:900}});const p=await c.newPage();
  p.on('pageerror',e=>errs.push(email+' '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push(email+' console '+m.text().slice(0,200))});
  await p.goto(B+'/login');await p.fill('input[type=email]',email);if(name)await p.fill('input[autocomplete=name]',name);await p.click('text=Email me a sign-in code');
  await p.waitForSelector('input[autocomplete=one-time-code]');await p.fill('input[autocomplete=one-time-code]',await code(email));await p.click('button:has-text("Sign in")');await p.waitForURL(/account/);return p}
const step=s=>console.log('✓',s);
const IMG=n=>process.env.IMG_DIR+'/'+n+'.jpg'; // any three JPGs named face, w1, w2
async function avatar(p){await p.setInputFiles('.drop input >> nth=0',IMG('face'));await p.waitForSelector('input[name=photo_url]',{state:'attached'})}
(async()=>{sql('truncate auth.users, public.companies, public.notifications cascade');sql("insert into storage.buckets (id, name, public) values ('photos','photos',true) on conflict do nothing");await fetch('http://127.0.0.1:54324/api/v1/messages',{method:'DELETE'});const b=await chromium.launch();try{
 // company owner
 const o=await user(b,'owner@test.local','Dana Owner');step('owner signed in by email code');
 await o.goto(B+'/join/company');await o.fill('input[name=name]','Peninsula Pipe Co');await o.fill('input[name=license]','1045001');await o.fill('input[name=city]','Redwood City');await o.fill('textarea[name=about]','Plumbing company for test.');
 await o.click('button:has-text("Register company")');await o.waitForURL(/business/);step('company registered → business page');
 const a=await user(b,'admin@test.local','Ada Admin');sql("update profiles set role='admin' where id=(select id from auth.users where email='admin@test.local')");
 await a.goto(B+'/admin');await a.click('form:has-text("Peninsula Pipe Co") button:has-text("Approve")');await a.waitForTimeout(800);
 if(sql("select status from companies")!=='verified')throw new Error('admin approve company failed');step('admin approved the company with a button');
 await o.reload();await o.click('button:has-text("New technician invite")');await o.waitForSelector('code');const inv=(await o.textContent('code')).trim();step('invite link '+inv);
 // technician
 const t=await user(b,'tech@test.local','Tom Tech',true);await t.goto(inv);await t.waitForURL(/join\/pro\?invite/);
 await t.fill('input[name=name]','Tom Tech');await avatar(t);await t.check('input[name=svc_faucet-replacement]');await t.click('button:has-text("Create my profile")');await t.waitForURL(/account/);step('technician joined through invite');
 // solo pro
 const s=await user(b,'solo@test.local','Max Solo');await s.goto(B+'/join/pro');await s.fill('input[name=name]','Max Solo');await s.fill('input[name=license]','1121547');await avatar(s);
 await s.fill('textarea[name=experience]','Nine years as a plumber, four on my own.');await s.fill('input[name=skills]','Water heaters, Repipes, Leak detection');
 await s.setInputFiles('.drop input >> nth=1',[IMG('w1'),IMG('w2')]);await s.waitForFunction(()=>document.querySelectorAll('input[name=work_url]').length===2);
 await s.check('input[name=tier_premium]');await s.check('input[name=svc_faucet-replacement]');await s.fill('input[name=price_faucet-replacement]','400');await s.check('input[name=day_0]',{force:true});await s.check('input[name=day_6]',{force:true});
 await s.click('button:has-text("Create my profile")');await s.waitForURL(/account/);step('solo pro registered');
 for(const n of ['Tom Tech','Max Solo']){await a.goto(B+'/admin');const f=a.locator(`form:has-text("${n}")`);await f.locator('input[name=id_ok]').check();await f.locator('input[name=license_ok]').check();await f.locator('button:has-text("Approve")').click();await a.waitForTimeout(800)}
 if(sql("select count(*) from pros where status='verified' and id_verified")!=='2')throw new Error('admin approve pros failed');step('admin approved both pros (license + ID)');
 await s.goto(B+'/account/profile');await s.fill('textarea[name=experience]','Ten years now. Tankless heaters are my favorite.');await s.click('button:has-text("Save changes")');await s.waitForSelector('text=Saved');
 if(!sql("select experience from pros where display_name='Max Solo'").startsWith('Ten years'))throw new Error('profile edit not saved');step('pro edited profile');
 if(sql("select count(*) from pro_services p join pros x on x.id=p.pro_id where x.display_name='Max Solo' and active")!=='1')throw new Error('services lost on edit');
 console.log('  techs in company:',sql("select count(*) from pros where company_id is not null"));
 // client: request a visit
 const c=await user(b,'client@test.local','Anna Client',true);step('client signed in');
 await c.goto(B+'/companies');await c.click('text=Peninsula Pipe Co');await c.click('text=Request a visit');await c.selectOption('select[name=svc]','faucet-replacement');
 await c.fill('input[name=address]','100 Main St, Redwood City');await c.click('button:has-text("Request a visit")');await c.waitForURL(/account\?booked/);
 if(!(await c.content()).includes('The office will assign a technician'))throw new Error('no pending assignment shown');step('client requested a visit, waits for assignment');
 // office assigns
 await o.goto(B+'/business');await o.selectOption('select[name=pro]',{label:'Tom Tech'});await o.fill('input[name=time]','2030-03-04T10:00');await o.click('button:has-text("Save")');await o.waitForTimeout(800);
 await c.reload();const ct=await c.content();if(!ct.includes('Tom Tech')||!ct.includes('assigned by the office'))throw new Error('assigned tech not visible to client');step('office assigned Tom → client sees him + notification');
 await c.screenshot({path:D+'e_client.png',fullPage:true});
 // client books solo pro by slot
 await c.goto(B+'/search?svc=faucet-replacement');await c.click('text=Max Solo');await c.waitForURL(/pro\//);if((await c.locator('.works img').count())!==2)throw new Error('work photos not on public page');step('public page shows real photo + 2 work photos');await c.screenshot({path:D+'e_pro.png',fullPage:true});
 await c.click('button:has-text("Message Max")');await c.waitForURL(/messages\//);await c.fill('textarea[name=body]','Hi Max, can you replace a kitchen faucet this week?');await c.click('button:has-text("Send")');await c.waitForTimeout(800);
 await s.goto(B+'/messages');await s.click('text=Anna Client');await s.waitForSelector('text=kitchen faucet');await s.fill('textarea[name=body]','Yes, pick any open time on my page.');await s.click('button:has-text("Send")');await s.waitForTimeout(800);
 await c.reload();await c.waitForSelector('text=pick any open time');
 await c.setInputFiles('label[aria-label="Attach photos"] input',IMG('w1'));await c.waitForSelector('input[name=photo_url]',{state:'attached'});await c.fill('textarea[name=body]','This is the faucet.');await c.click('button:has-text("Send")');await c.waitForTimeout(1000);
 await s.reload();await s.waitForSelector('img[alt=Photo]');step('client and pro chatted, photo sent in chat');await c.screenshot({path:D+'e_chat.png',fullPage:true});
 await c.goto(B+'/pro/max-solo?svc=faucet-replacement');await c.click('.slots a >> nth=0');await c.fill('input[name=address]','100 Main St, Redwood City');await c.click('button:has-text("Send booking request")');await c.waitForURL(/account\?booked/);step('client booked solo pro for a slot');
 // pro flows job to done
 await s.goto(B+'/account');await s.click('button:has-text("Confirm")');await s.waitForTimeout(700);
 await s.setInputFiles('text=Add BEFORE photos >> xpath=ancestor::label//input',IMG('w1'));await s.waitForSelector('form:has(input[name=kind][value=before]) input[name=work_url]',{state:'attached'});await s.click('button:has-text("Save job photos")');await s.waitForTimeout(700);
 for(const l of ['Start','Done']){await s.click(`button:has-text("${l}")`);await s.waitForTimeout(700)}
 await s.setInputFiles('text=Add AFTER photos >> xpath=ancestor::label//input',IMG('w2'));await s.waitForSelector('form:has(input[name=kind][value=after]) input[name=work_url]',{state:'attached'});await s.click('button:has-text("Save job photos")');await s.waitForTimeout(700);
 console.log('  photos:',sql("select string_agg(kind||'='||n, ', ') from (select kind, count(*) n from pro_photos group by kind) x"));
 console.log('  status:',sql("select status from bookings where pro_id=(select id from pros where display_name='Max Solo')"),' jobs counter:',sql("select jobs_count from pro_services ps join pros p on p.id=ps.pro_id where p.display_name='Max Solo' and service_id='faucet-replacement'"));step('pro confirmed → started → done');
 // client reviews
 await c.goto(B+'/account');if((await c.locator('img[alt="before photo"]').count())!==1||(await c.locator('img[alt="after photo"]').count())!==1)throw new Error('client does not see before/after');step('client sees before/after photos of the job');
 await c.screenshot({path:D+'e_client2.png',fullPage:true});await c.selectOption('select[name=cleanliness]','4');await c.fill('textarea[name=body]','On time, clean, fair price.');await c.click('button:has-text("Post review")');await c.waitForTimeout(800);
 console.log('  review:',sql("select author_name||' '||cleanliness||' '||service_id from reviews"));step('client posted review');
 await s.goto(B+'/account');await s.click('button:has-text("Save rating")');await s.waitForTimeout(800);
 if(sql("select publish_at<=now() from reviews")!=='t')throw new Error('review not published after both rated');step('pro rated client → review published');
 await s.goto(B+'/account/reviews');await s.fill('textarea[name=body]','Thank you Anna! Glad the new faucet works well.');await s.click('button:has-text("Post reply")');await s.waitForTimeout(1500);await s.screenshot({path:D+'e_reply.png',fullPage:true});await s.waitForSelector('.reply:has-text("Glad the new faucet")',{timeout:5000});
 await c.goto(B+'/pro/max-solo');await c.waitForSelector('text=Glad the new faucet');step('reply shows on the public page');await c.screenshot({path:D+'e_pro2.png',fullPage:true});
 await o.goto(B+'/business');await o.screenshot({path:D+'e_business.png',fullPage:true});
}catch(e){console.log('FAIL',e.message)}console.log(errs.length?errs.join('\n'):'no page errors');await b.close()})();

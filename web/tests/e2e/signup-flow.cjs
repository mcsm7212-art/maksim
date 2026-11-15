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
(async()=>{sql('truncate auth.users, public.companies, public.notifications cascade');await fetch('http://127.0.0.1:54324/api/v1/messages',{method:'DELETE'});const b=await chromium.launch();try{
 // company owner
 const o=await user(b,'owner@test.local','Dana Owner');step('owner signed in by email code');
 await o.goto(B+'/join/company');await o.fill('input[name=name]','Peninsula Pipe Co');await o.fill('input[name=license]','1045001');await o.fill('input[name=city]','Redwood City');await o.fill('textarea[name=about]','Plumbing company for test.');
 await o.click('button:has-text("Register company")');await o.waitForURL(/business/);step('company registered → business page');
 sql("update companies set status='verified'");
 await o.reload();await o.click('button:has-text("New technician invite")');await o.waitForSelector('code');const inv=(await o.textContent('code')).trim();step('invite link '+inv);
 // technician
 const t=await user(b,'tech@test.local','Tom Tech',true);await t.goto(inv);await t.waitForURL(/join\/pro\?invite/);
 await t.fill('input[name=name]','Tom Tech');await t.check('input[name=svc_faucet-replacement]');await t.click('button:has-text("Create my profile")');await t.waitForURL(/account/);step('technician joined through invite');
 // solo pro
 const s=await user(b,'solo@test.local','Max Solo');await s.goto(B+'/join/pro');await s.fill('input[name=name]','Max Solo');await s.fill('input[name=license]','1121547');
 await s.check('input[name=tier_premium]');await s.check('input[name=svc_faucet-replacement]');await s.fill('input[name=price_faucet-replacement]','400');await s.check('input[name=day_0]',{force:true});await s.check('input[name=day_6]',{force:true});
 await s.click('button:has-text("Create my profile")');await s.waitForURL(/account/);step('solo pro registered');
 sql("update pros set status='verified', license_status='verified', id_verified=true");
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
 await c.goto(B+'/search?svc=faucet-replacement');await c.click('text=Max Solo');await c.waitForURL(/pro\//);await c.screenshot({path:D+'e_pro.png'});
 await c.click('.slots a >> nth=0');await c.fill('input[name=address]','100 Main St, Redwood City');await c.click('button:has-text("Send booking request")');await c.waitForURL(/account\?booked/);step('client booked solo pro for a slot');
 // pro flows job to done
 await s.goto(B+'/account');for(const l of ['Confirm','Start','Done']){await s.click(`button:has-text("${l}")`);await s.waitForTimeout(700)}
 console.log('  status:',sql("select status from bookings where pro_id=(select id from pros where display_name='Max Solo')"),' jobs counter:',sql("select jobs_count from pro_services ps join pros p on p.id=ps.pro_id where p.display_name='Max Solo' and service_id='faucet-replacement'"));step('pro confirmed → started → done');
 // client reviews
 await c.goto(B+'/account');await c.selectOption('select[name=cleanliness]','4');await c.fill('textarea[name=body]','On time, clean, fair price.');await c.click('button:has-text("Post review")');await c.waitForTimeout(800);
 console.log('  review:',sql("select author_name||' '||cleanliness||' '||service_id from reviews"));step('client posted review');
 await o.goto(B+'/business');await o.screenshot({path:D+'e_business.png',fullPage:true});
}catch(e){console.log('FAIL',e.message)}console.log(errs.length?errs.join('\n'):'no page errors');await b.close()})();

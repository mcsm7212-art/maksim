// Tiny stand-in for the Supabase API gateway: /auth/v1 -> GoTrue, /rest/v1 -> PostgREST
const http=require('http');
http.createServer((req,res)=>{
  const cors={'access-control-allow-origin':req.headers.origin||'*','access-control-allow-credentials':'true','access-control-allow-headers':req.headers['access-control-request-headers']||'*','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-expose-headers':'*'};
  if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end()}
  const routes=[['/auth/v1',9999],['/rest/v1',3001],['/storage/v1',5000]];
  const r=routes.find(([p])=>req.url.startsWith(p));
  if(!r){res.writeHead(404);return res.end('no route')}
  const h={...req.headers};delete h.host;
  const up=http.request({host:'127.0.0.1',port:r[1],path:req.url.slice(r[0].length)||'/',method:req.method,headers:h},u=>{res.writeHead(u.statusCode,{...u.headers,...cors});u.pipe(res)});
  up.on('error',e=>{res.writeHead(502);res.end(String(e))});req.pipe(up);
}).listen(54321,'127.0.0.1',()=>console.log('gateway on 54321'));

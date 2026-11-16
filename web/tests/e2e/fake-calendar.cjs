// Serves a fake personal calendar: tomorrow 8:00-12:00 Bay Area time is busy.
const http=require('http');
http.createServer((req,res)=>{
  const now=new Date(Date.now()+864e5);const ymd=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(now).replace(/-/g,'');
  res.writeHead(200,{'content-type':'text/calendar'});
  res.end(`BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;TZID=America/Los_Angeles:${ymd}T080000\r\nDTEND;TZID=America/Los_Angeles:${ymd}T120000\r\nSUMMARY:Private appointment\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`);
}).listen(54398,'127.0.0.1');

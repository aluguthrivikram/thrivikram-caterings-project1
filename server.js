const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const ADMIN_USER = process.env.ADMIN_USER || 'thrivikram';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'theivikram123';
const sessions = new Map();
const visitors = new Map();

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ bookings: [] }, null, 2));

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); }
  catch { return { bookings: [] }; }
}
function writeStore(data) { fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2)); }
function clean(v, max=500) { return String(v ?? '').trim().slice(0, max); }
function makeId(prefix='BK') { return prefix + '-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase(); }
function auth(req,res,next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i,'') || req.cookies?.admin_token;
  if (!token || !sessions.has(token)) return res.status(401).json({ error:'Unauthorized' });
  req.admin = sessions.get(token); next();
}

app.use(express.json({ limit:'1mb' }));
app.use(express.urlencoded({ extended:true }));
app.use(express.static(path.join(ROOT,'public')));

app.post('/api/visitor/heartbeat', (req,res)=>{
  const id = clean(req.body.visitorId, 100) || crypto.randomBytes(12).toString('hex');
  visitors.set(id, { last: Date.now() });
  res.json({ visitorId:id, liveVisitors: liveVisitorCount() });
});
app.get('/api/visitor/count', (req,res)=>res.json({ liveVisitors: liveVisitorCount() }));
function liveVisitorCount(){
  const cutoff = Date.now()-45*1000;
  for (const [id,v] of visitors) if (v.last < cutoff) visitors.delete(id);
  return visitors.size;
}

app.post('/api/bookings', (req,res)=>{
  const b = req.body || {};
  const required = ['name','phone','eventType','date','people'];
  const missing = required.filter(k => !clean(b[k]));
  if (missing.length) return res.status(400).json({ error:'Please complete: '+missing.join(', ') });
  const people = Number(b.people);
  if (!Number.isInteger(people) || people < 1 || people > 100000) return res.status(400).json({ error:'Enter a valid number of guests.' });
  const store = readStore();
  const booking = {
    id: makeId(), createdAt: new Date().toISOString(), status:'New',
    name:clean(b.name,100), phone:clean(b.phone,30), email:clean(b.email,120),
    eventType:clean(b.eventType,100), otherEvent:clean(b.otherEvent,100), date:clean(b.date,30),
    time:clean(b.time,30), venue:clean(b.venue,200), people,
    foodPreference:clean(b.foodPreference,50), package:clean(b.package,100),
    menuItems:Array.isArray(b.menuItems) ? b.menuItems.map(x=>clean(x,100)).slice(0,100) : [],
    labour: b.labour === true || b.labour === 'true',
    message:clean(b.message,1000)
  };
  store.bookings = store.bookings || [];
  store.bookings.unshift(booking);
  writeStore(store);
  res.status(201).json({ ok:true, bookingId:booking.id, message:'Your catering request has been received. Our team will contact you shortly.' });
});

app.post('/api/admin/login',(req,res)=>{
  const user=clean(req.body.username,100), pass=String(req.body.password||'');
  if(user!==ADMIN_USER || pass!==ADMIN_PASSWORD) return res.status(401).json({error:'Invalid admin credentials'});
  const token=crypto.randomBytes(32).toString('hex');
  sessions.set(token,{user,createdAt:Date.now()});
  res.json({token,user});
});
app.post('/api/admin/logout',auth,(req,res)=>{ const token=req.headers.authorization?.replace(/^Bearer\s+/i,''); sessions.delete(token); res.json({ok:true}); });
app.get('/api/admin/stats',auth,(req,res)=>{
  const store=readStore(), bookings=store.bookings||[];
  const today=new Date().toISOString().slice(0,10);
  res.json({
    liveVisitors:liveVisitorCount(), totalBookings:bookings.length,
    newBookings:bookings.filter(b=>b.status==='New').length,
    confirmed:bookings.filter(b=>b.status==='Confirmed').length,
    todayBookings:bookings.filter(b=>b.createdAt?.slice(0,10)===today).length,
    guestsBooked:bookings.reduce((s,b)=>s+Number(b.people||0),0)
  });
});
app.get('/api/admin/bookings',auth,(req,res)=>{
  const store=readStore(); res.json({bookings:store.bookings||[]});
});
app.patch('/api/admin/bookings/:id',auth,(req,res)=>{
  const store=readStore(), booking=(store.bookings||[]).find(b=>b.id===req.params.id);
  if(!booking) return res.status(404).json({error:'Booking not found'});
  const allowed=['New','Contacted','Confirmed','Completed','Rejected','Cancelled'];
  if(req.body.status && allowed.includes(req.body.status)) booking.status=req.body.status;
  writeStore(store); res.json({ok:true,booking});
});
app.delete('/api/admin/bookings/:id',auth,(req,res)=>{
  const store=readStore(); const before=(store.bookings||[]).length;
  store.bookings=(store.bookings||[]).filter(b=>b.id!==req.params.id);
  if(store.bookings.length===before) return res.status(404).json({error:'Booking not found'});
  writeStore(store); res.json({ok:true});
});
app.get('/api/admin/export',auth,(req,res)=>{
  const store=readStore();
  const rows=store.bookings||[];
  const headers=['ID','Created','Status','Name','Phone','Email','Event','Date','Time','Venue','People','Food Preference','Package','Menu','Labour','Message'];
  const esc=x=>'"'+String(x??'').replace(/"/g,'""')+'"';
  const csv=[headers, ...rows.map(b=>[b.id,b.createdAt,b.status,b.name,b.phone,b.email,b.eventType,b.date,b.time,b.venue,b.people,b.foodPreference,b.package,(b.menuItems||[]).join('; '),b.labour?'Yes':'No',b.message])].map(r=>r.map(esc).join(',')).join('\n');
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="thrivikram-catering-bookings.csv"'); res.send(csv);
});

app.get('/admin',(req,res)=>res.sendFile(path.join(ROOT,'public','admin.html')));
app.listen(PORT,()=>console.log(`Thrivikram Caterings running at http://localhost:${PORT}`));

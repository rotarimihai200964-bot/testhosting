const express=require('express'),crypto=require('crypto'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const D=path.join(__dirname,'data'),DB=path.join(D,'db.json'),KF=path.join(D,'secret.key');
fs.mkdirSync(D,{recursive:true});
if(!fs.existsSync(KF))fs.writeFileSync(KF,crypto.randomBytes(32).toString('hex'),{mode:0o600});
const KEY=Buffer.from(fs.readFileSync(KF,'utf8').trim(),'hex');
let db={users:{}};try{db=JSON.parse(fs.readFileSync(DB))}catch{}
const save=()=>fs.writeFileSync(DB,JSON.stringify(db)),get=u=>Object.hasOwn(db.users,u)?db.users[u]:null;
const enc=t=>{const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',KEY,iv),b=Buffer.concat([c.update(t,'utf8'),c.final()]);return[iv,c.getAuthTag(),b].map(x=>x.toString('hex')).join('.')};
const dec=s=>{const[i,a,b]=s.split('.').map(x=>Buffer.from(x,'hex')),d=crypto.createDecipheriv('aes-256-gcm',KEY,i);d.setAuthTag(a);return Buffer.concat([d.update(b),d.final()]).toString('utf8')};
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>s+':'+crypto.scryptSync(p,s,64).toString('hex');
const chk=(p,h)=>{const x=hash(p,h.split(':')[0]);return x.length===h.length&&crypto.timingSafeEqual(Buffer.from(x),Buffer.from(h))};
const me=async t=>{const x=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:'Bot '+String(t||'').trim()}});if(!x.ok)throw 0;return x.json()};
const S={},procs={},logs={},tries={};
function start(u){if(procs[u])return;const p=spawn(process.execPath,['bot.js'],{cwd:__dirname,env:{...process.env,DISCORD_TOKEN:dec(db.users[u].token)}}),L=logs[u]=logs[u]||[];
 const add=d=>{d.toString().split('\n').filter(Boolean).forEach(l=>L.push(new Date().toLocaleTimeString()+'  '+l));while(L.length>200)L.shift()};
 p.stdout.on('data',add);p.stderr.on('data',add);p.on('exit',c=>{add('Oprit (cod '+c+')');delete procs[u]});procs[u]=p}
const stop=u=>new Promise(r=>{const p=procs[u];if(!p)return r();p.once('exit',r);p.kill()});
const sid=q=>((q.headers.cookie||'').match(/(?:^|; )s=([a-f0-9]+)/)||[])[1];
const sess=(r,u)=>{const t=crypto.randomBytes(24).toString('hex');S[t]=u;r.setHeader('Set-Cookie','s='+t+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800'+(r.req.secure?'; Secure':''))};
const auth=(q,r,n)=>{const s=sid(q),u=S[s];if(!u||!get(u))return bad(r,'Autentifică-te din nou',401);q.u=u;q.sid=s;n()};
const bad=(r,m,c=400)=>r.status(c).json({error:m});
const inv=id=>`https://discord.com/oauth2/authorize?client_id=${id}&scope=bot%20applications.commands&permissions=1099511704576`;
const app=express();if(process.env.PROXY)app.set('trust proxy',1);
app.use(express.json(),express.static(path.join(__dirname,'public')));
app.get('/api/state',(q,r)=>{const u=S[sid(q)];r.json({user:u&&get(u)?u:null,accounts:!!Object.keys(db.users).length})});
app.post('/api/check',async(q,r)=>{try{r.json({name:(await me(q.body.token)).username})}catch{bad(r,'Token invalid. În Developer Portal: Bot → Reset Token, apoi copiază-l.')}});
app.post('/api/register',async(q,r)=>{const{user,token}=q.body,pw=String(q.body.password||'');
 if(!/^[a-z0-9_]{3,32}$/.test(user||''))return bad(r,'Nume cont: 3-32 litere mici, cifre sau _');
 if(pw.length<8)return bad(r,'Parola trebuie să aibă minim 8 caractere');
 if(get(user))return bad(r,'Numele de cont există deja',409);
 let b;try{b=await me(token)}catch{return bad(r,'Token invalid')}
 db.users[user]={pw:hash(pw),token:enc(String(token).trim()),id:b.id,name:b.username,on:true};save();sess(r,user);start(user);r.json({ok:1})});
app.post('/api/login',(q,r)=>{const t=tries[q.ip]=(tries[q.ip]||[]).filter(x=>Date.now()-x<6e5),u=String(q.body.user||''),U=get(u);
 if(t.length>=10)return bad(r,'Prea multe încercări. Mai încearcă peste 10 minute.',429);
 if(!U||!chk(String(q.body.password||''),U.pw)){t.push(Date.now());return bad(r,'Nume sau parolă greșită',401)}
 sess(r,u);r.json({ok:1})});
app.post('/api/logout',auth,(q,r)=>{delete S[q.sid];r.json({ok:1})});
app.get('/api/bot',auth,(q,r)=>{const U=get(q.u);r.json({name:U.name,running:!!procs[q.u],invite:inv(U.id),logs:logs[q.u]||[]})});
app.post('/api/bot/:a',auth,async(q,r)=>{const u=q.u,a=q.params.a;if(!['start','stop','restart'].includes(a))return r.sendStatus(404);
 if(a!=='start')await stop(u);if(a!=='stop')start(u);get(u).on=a!=='stop';save();r.json({ok:1})});
Object.keys(db.users).forEach(u=>db.users[u].on&&start(u));
['SIGINT','SIGTERM'].forEach(s=>process.on(s,()=>process.exit()));
process.on('exit',()=>Object.values(procs).forEach(p=>p.kill()));
app.listen(process.env.PORT||3000,()=>console.log('ogcraft host: http://localhost:'+(process.env.PORT||3000)));

const{Client,GatewayIntentBits:G,REST,Routes,SlashCommandBuilder:S}=require('discord.js');
const IP=process.env.MC_IP||'ogcraft.mc-gravel.com',KEY=process.env.ANTHROPIC_API_KEY,MODEL=process.env.AI_MODEL||'claude-haiku-5-5';
const c=new Client({intents:[G.Guilds,G.GuildMessages]}),hist=new Map();
const cmds=[new S().setName('ip').setDescription('IP-ul serverului Minecraft'),
 new S().setName('ai').setDescription('Întreabă AI-ul').addStringOption(o=>o.setName('intrebare').setDescription('Întrebarea ta').setRequired(true))].map(x=>x.toJSON());
c.once('ready',async()=>{await new REST().setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(c.user.id),{body:cmds});console.log('Online ca '+c.user.tag)});
c.on('interactionCreate',async i=>{
 if(!i.isChatInputCommand())return;
 if(i.commandName==='ip')return i.reply('🎮 IP: `'+IP+'`');
 if(!KEY)return i.reply({content:'AI nu este configurat (lipsește ANTHROPIC_API_KEY).',flags:64});
 await i.deferReply();
 try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':KEY,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:MODEL,max_tokens:500,system:'Răspunde scurt, în limba utilizatorului.',messages:[{role:'user',content:i.options.getString('intrebare')}]})}),j=await r.json();
  await i.editReply((j.content?.[0]?.text||'Eroare AI.').slice(0,1900))}catch{await i.editReply('Eroare AI.')}
});
c.on('messageCreate',async m=>{
 if(m.author.bot||!m.guild||m.member?.permissions.has('ManageMessages'))return;
 const now=Date.now(),a=(hist.get(m.author.id)||[]).filter(x=>now-x.t<6000);a.push({t:now,m});hist.set(m.author.id,a);
 if(a.length>=5||m.mentions.users.size>=5){hist.delete(m.author.id);
  await m.channel.bulkDelete(a.map(x=>x.m),true).catch(()=>{});
  await m.member?.timeout(60000,'Spam').catch(()=>{});
  m.channel.send(`🚫 ${m.author}, fără spam!`).then(x=>setTimeout(()=>x.delete().catch(()=>{}),5000)).catch(()=>{})}
});
setInterval(()=>hist.clear(),60000);
c.login(process.env.DISCORD_TOKEN).catch(e=>{console.log('Eroare login: '+e.message);process.exit(1)});

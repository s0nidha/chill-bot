const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const TOKEN     = process.env.TOKEN     || 'VOTRE_TOKEN_ICI';
const CLIENT_ID = process.env.CLIENT_ID || 'VOTRE_CLIENT_ID_ICI';
const LEVELUP_CHANNEL = '📦・service-des-promotions';

// ─── COULEURS ─────────────────────────────────────────────────────────────────
const C = { bg: '#522C1F', yellow: '#FFE48C', blue: '#A3CAF5', cream: '#FBF5E9' };

// ─── ROLES — seuils XP ronds ──────────────────────────────────────────────────
const ROLES = [
  { level: 1,  name: 'Stagiaire du Canape',                   emoji: '📦', color: '#4A90D9', xp: 0    },
  { level: 2,  name: 'Alternant du Chill',                    emoji: '🧃', color: '#57A64A', xp: 200  },
  { level: 5,  name: 'Observateur Fantome',                   emoji: '📡', color: '#D0D0D0', xp: 600  },
  { level: 8,  name: 'Place Reservee du Canape',              emoji: '🪑', color: '#964B00', xp: 1100 },
  { level: 10, name: 'Seigneur du Gaming',                    emoji: '🎮', color: '#9370DB', xp: 1600 },
  { level: 12, name: 'Ministre des Vocaux',                   emoji: '🎤', color: '#E84040', xp: 2100 },
  { level: 14, name: 'Responsable Snack',                     emoji: '🍿', color: '#FFD700', xp: 2600 },
  { level: 16, name: 'Agent du Drama Controle',               emoji: '🚨', color: '#FF8C00', xp: 3200 },
  { level: 18, name: 'Archiviste des Takes',                  emoji: '📜', color: '#4A90D9', xp: 3800 },
  { level: 20, name: 'Pompier du Serveur',                    emoji: '🧯', color: '#1A1A1A', xp: 4500 },
  { level: 22, name: 'Directeur des Memes',                   emoji: '🎭', color: '#57A64A', xp: 5200 },
  { level: 25, name: 'Conseiller Supreme du Chaos',           emoji: '🧠', color: '#E84040', xp: 6300 },
  { level: 30, name: 'PDG du Chill',                          emoji: '👑', color: '#FFD700', xp: 8200 },
];

// Noms complets pour Discord (avec accents)
const ROLE_NAMES_FULL = {
  'Stagiaire du Canape':         '📦 Stagiaire du Canapé',
  'Alternant du Chill':          '🧃 Alternant du Chill',
  'Observateur Fantome':         '📡 Observateur Fantôme',
  'Place Reservee du Canape':    '🪑 Place Réservée du Canapé',
  'Seigneur du Gaming':          '🎮 Seigneur du Gaming',
  'Ministre des Vocaux':         '🎤 Ministre des Vocaux',
  'Responsable Snack':           '🍿 Responsable Snack & Approvisionnement',
  'Agent du Drama Controle':     '🚨 Agent du Drama Contrôlé',
  'Archiviste des Takes':        '📜 Archiviste des Takes Douteuses',
  'Pompier du Serveur':          '🧯 Pompier du Serveur',
  'Directeur des Memes':         '🎭 Directeur des Memes',
  'Conseiller Supreme du Chaos': '🧠 Conseiller Suprême du Chaos',
  'PDG du Chill':                '👑 PDG du Chill',
};

function getRoleForXp(xp) {
  let r = ROLES[0];
  for (const role of ROLES) { if (xp >= role.xp) r = role; }
  return r;
}
function getNextRole(xp) {
  for (const role of ROLES) { if (role.xp > xp) return role; }
  return null;
}

// ─── XP DATA + SAUVEGARDE JSON ────────────────────────────────────────────────
const DATA_FILE = './xpData.json';
const xpData = fs.existsSync(DATA_FILE)
  ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  : {};

function saveXp() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(xpData, null, 2));
}

const msgCooldowns   = new Map();
const reactCooldowns = new Map();
function getUser(id) { if (!xpData[id]) xpData[id] = { xp: 0 }; return xpData[id]; }

// ─── CANVAS UTILITAIRES ───────────────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}
function fillRR(ctx, x, y, w, h, r, color) {
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha = 1;
  roundRect(ctx, x, y, w, h, r); ctx.fill(); ctx.restore();
}
function drawStatBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(163,202,245,0.08)'; ctx.strokeStyle = 'rgba(163,202,245,0.2)'; ctx.lineWidth = 0.5;
  roundRect(ctx, x, y, w, h, 8); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawBadge(ctx, x, y, l1, l2) {
  fillRR(ctx, x, y, 130, 44, 4, C.blue);
  ctx.save(); ctx.strokeStyle = C.cream; ctx.lineWidth = 2;
  roundRect(ctx, x, y, 130, 44, 4); ctx.stroke();
  ctx.fillStyle = C.bg; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(l1, x+65, y+16); ctx.fillText(l2, x+65, y+32);
  ctx.restore();
}
function drawStamp(ctx, x, y, text) {
  ctx.save(); ctx.font = 'bold 11px sans-serif';
  const tw = ctx.measureText(text).width + 24;
  ctx.strokeStyle = C.yellow; ctx.lineWidth = 1.5;
  roundRect(ctx, x-tw, y, tw, 28, 4); ctx.stroke();
  ctx.fillStyle = C.yellow; ctx.textAlign = 'right';
  ctx.fillText(text, x-12, y+18); ctx.restore();
}
function drawDash(ctx, x1, y, x2) {
  ctx.save(); ctx.setLineDash([6,4]); ctx.strokeStyle='rgba(163,202,245,0.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke(); ctx.restore();
}
function drawLine(ctx, x1, y, x2) {
  ctx.save(); ctx.strokeStyle='rgba(163,202,245,0.2)'; ctx.lineWidth=0.5;
  ctx.beginPath(); ctx.moveTo(x1,y); ctx.lineTo(x2,y); ctx.stroke(); ctx.restore();
}
function drawBar(ctx, x, y, w, h, pct) {
  ctx.save();
  fillRR(ctx, x, y, w, h, h/2, 'rgba(251,245,233,0.1)');
  const fill = Math.max(w * Math.min(Math.max(pct,0),1), h);
  fillRR(ctx, x, y, fill, h, h/2, C.blue);
  ctx.restore();
}
function drawSectionLbl(ctx, x, y, text) {
  ctx.save();
  fillRR(ctx, x, y-8, 10, 10, 2, 'rgba(163,202,245,0.5)');
  ctx.fillStyle = C.blue; ctx.globalAlpha=0.8; ctx.font='10px sans-serif';
  ctx.fillText(text, x+18, y); ctx.restore();
}
function drawDot(ctx, role, cx, cy, size) {
  ctx.save();
  ctx.fillStyle = role.color;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, size/2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}
function short(name) { return name.length > 16 ? name.substring(0,15)+'...' : name; }

// ─── CARTE PROFIL ─────────────────────────────────────────────────────────────
async function drawProfileCard(member, xp) {
  const W=560, H=420, pad=20;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRR(ctx, 0, 0, W, H, 10, C.bg);

  // Header
  ctx.fillStyle = C.yellow; ctx.fillRect(0, 0, W, 48);
  ctx.fillStyle = C.bg; ctx.font = 'bold 11px sans-serif'; ctx.textAlign='left';
  ctx.fillText('>>>  DOSSIER RH OFFICIEL  —  LES IRRECUPERABLES', pad, 30);
  ctx.save(); ctx.globalAlpha=0.6; ctx.font='10px sans-serif'; ctx.textAlign='right';
  ctx.fillText('Ref. EMP-'+String(xp).padStart(4,'0'), W-pad, 30); ctx.restore();

  const role     = getRoleForXp(xp);
  const nextRole = getNextRole(xp);
  const xpCur    = Math.max(0, xp - role.xp);
  const xpNxt    = nextRole ? nextRole.xp - role.xp : 1;
  const pct      = nextRole ? xpCur / xpNxt : 1;

  // Avatar
  fillRR(ctx, pad, 68, 56, 56, 8, C.blue);
  ctx.save(); ctx.strokeStyle=C.yellow; ctx.lineWidth=2;
  roundRect(ctx, pad, 68, 56, 56, 8); ctx.stroke();
  ctx.fillStyle=C.bg; ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
  ctx.fillText(member.displayName[0].toUpperCase(), pad+28, 104); ctx.restore();

  // Nom + rôle
  ctx.fillStyle=C.cream; ctx.font='bold 20px sans-serif'; ctx.textAlign='left';
  ctx.fillText(member.displayName, pad+70, 90);
  drawDot(ctx, role, pad+76, 107, 10);
  ctx.fillStyle=C.yellow; ctx.font='bold 12px sans-serif';
  ctx.fillText(role.name, pad+86, 111);

  drawBadge(ctx, W-pad-130, 68, 'FICHE', 'EMPLOYE');
  drawDash(ctx, pad, 140, W-pad);
  drawSectionLbl(ctx, pad, 165, 'BILAN DE CARRIERE');

  // Stats
  const sbW = (W-pad*2-20)/3;
  const sbY=175, sbH=90;

  // Échelon
  drawStatBox(ctx, pad, sbY, sbW, sbH);
  ctx.save(); ctx.fillStyle=C.blue; ctx.globalAlpha=0.8; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('ECHELON', pad+sbW/2, sbY+18); ctx.globalAlpha=1;
  ctx.fillStyle=C.yellow; ctx.font='bold 26px sans-serif';
  ctx.fillText(String(role.level), pad+sbW/2, sbY+50);
  ctx.globalAlpha=0.5; ctx.fillStyle=C.cream; ctx.font='10px sans-serif';
  const rlw = ctx.measureText(role.name).width;
  drawDot(ctx, role, pad+sbW/2 - rlw/2 - 8, sbY+68, 7);
  ctx.textAlign='left';
  ctx.fillText(role.name, pad+sbW/2 - rlw/2 + 2, sbY+72);
  ctx.restore();

  // XP Total
  drawStatBox(ctx, pad+sbW+10, sbY, sbW, sbH);
  ctx.save(); ctx.fillStyle=C.blue; ctx.globalAlpha=0.8; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('XP TOTAL', pad+sbW+10+sbW/2, sbY+18); ctx.globalAlpha=1;
  ctx.fillStyle=C.yellow; ctx.font='bold 26px sans-serif';
  ctx.fillText(xp.toLocaleString('fr-FR'), pad+sbW+10+sbW/2, sbY+50);
  ctx.restore();

  // Classement
  const allXp = Object.entries(xpData).sort((a,b)=>b[1].xp-a[1].xp);
  const rank = allXp.findIndex(([id])=>id===member.id)+1;
  drawStatBox(ctx, pad+(sbW+10)*2, sbY, sbW, sbH);
  ctx.save(); ctx.fillStyle=C.blue; ctx.globalAlpha=0.8; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('CLASSEMENT', pad+(sbW+10)*2+sbW/2, sbY+18); ctx.globalAlpha=1;
  ctx.fillStyle=C.yellow; ctx.font='bold 26px sans-serif';
  ctx.fillText('#'+(rank||1), pad+(sbW+10)*2+sbW/2, sbY+50);
  ctx.restore();

  // Barre
  const barY=278;
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.6; ctx.font='11px sans-serif'; ctx.textAlign='left';
  ctx.fillText('Progression vers '+(nextRole?nextRole.name:'niveau max'), pad, barY);
  ctx.textAlign='right';
  ctx.fillText(nextRole?xpCur.toLocaleString('fr-FR')+' / '+xpNxt.toLocaleString('fr-FR')+' XP':'MAX', W-pad, barY);
  ctx.restore();
  drawBar(ctx, pad, barY+8, W-pad*2, 6, pct);

  // Footer
  drawLine(ctx, pad, H-52, W-pad);
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.35; ctx.font='9px sans-serif'; ctx.textAlign='left';
  ctx.fillText('SIEGE SOCIAL DU CANAPE  —  SERVICE RH FICTIF', pad, H-26); ctx.restore();
  drawStamp(ctx, W-pad, H-36, 'EMPLOYE');

  return canvas.toBuffer('image/png');
}

// ─── CARTE LEVEL UP ───────────────────────────────────────────────────────────
async function drawLevelUpCard(member, totalXp, oldRole, newRole) {
  const W=560, H=500, pad=20;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  fillRR(ctx, 0, 0, W, H, 10, C.bg);

  // Header
  ctx.fillStyle=C.yellow; ctx.fillRect(0, 0, W, 48);
  ctx.fillStyle=C.bg; ctx.font='bold 11px sans-serif'; ctx.textAlign='left';
  ctx.fillText('***  PROMOTION OFFICIELLE  —  LES IRRECUPERABLES', pad, 30);
  ctx.save(); ctx.globalAlpha=0.6; ctx.font='10px sans-serif'; ctx.textAlign='right';
  ctx.fillText('Ref. PROMO-'+String(newRole.level).padStart(4,'0'), W-pad, 30); ctx.restore();

  // Avatar
  fillRR(ctx, pad, 68, 56, 56, 8, C.blue);
  ctx.save(); ctx.strokeStyle=C.yellow; ctx.lineWidth=2;
  roundRect(ctx, pad, 68, 56, 56, 8); ctx.stroke();
  ctx.fillStyle=C.bg; ctx.font='bold 22px sans-serif'; ctx.textAlign='center';
  ctx.fillText(member.displayName[0].toUpperCase(), pad+28, 104); ctx.restore();

  // Nom
  ctx.fillStyle=C.cream; ctx.font='bold 20px sans-serif'; ctx.textAlign='left';
  ctx.fillText(member.displayName, pad+70, 88);

  drawBadge(ctx, W-pad-130, 68, 'DOSSIER', 'RH OFFICIEL');

  // Description
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.75; ctx.font='12px sans-serif'; ctx.textAlign='left';
  ctx.fillText('Le Canape enregistre ton evolution...', pad+70, 108);
  ctx.fillText("Tu atteins l'echelon ", pad+70, 124);
  const p1 = ctx.measureText("Tu atteins l'echelon ").width; ctx.restore();
  ctx.fillStyle=C.yellow; ctx.font='bold 12px sans-serif';
  ctx.fillText(String(newRole.level), pad+70+p1, 124);
  const p2 = ctx.measureText(String(newRole.level)).width;
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.75; ctx.font='12px sans-serif';
  ctx.fillText(' — ', pad+70+p1+p2, 124);
  const p3 = ctx.measureText(' — ').width; ctx.restore();
  drawDot(ctx, newRole, pad+70+p1+p2+p3+6, 120, 9);
  ctx.fillStyle=C.blue; ctx.font='bold 12px sans-serif';
  ctx.fillText(short(newRole.name), pad+70+p1+p2+p3+14, 124);

  drawDash(ctx, pad, 148, W-pad);

  // Box changement
  ctx.save(); ctx.fillStyle='rgba(163,202,245,0.08)'; ctx.strokeStyle='rgba(163,202,245,0.25)'; ctx.lineWidth=0.5;
  roundRect(ctx, pad, 158, W-pad*2, 115, 8); ctx.fill(); ctx.stroke(); ctx.restore();
  drawSectionLbl(ctx, pad+14, 180, 'CHANGEMENT DE GRADE OFFICIEL');

  const midX = W/2;

  // Ancien rôle
  ctx.save(); ctx.globalAlpha=0.5;
  drawDot(ctx, oldRole, midX-90, 208, 18);
  ctx.fillStyle=C.cream; ctx.font='12px sans-serif'; ctx.textAlign='center';
  ctx.fillText(short(oldRole.name), midX-90, 244);
  const ow = ctx.measureText(short(oldRole.name)).width;
  ctx.strokeStyle=C.cream; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(midX-90-ow/2,240); ctx.lineTo(midX-90+ow/2,240); ctx.stroke();
  ctx.restore();

  // Flèche
  ctx.fillStyle=C.blue; ctx.font='20px sans-serif'; ctx.textAlign='center';
  ctx.fillText('->', midX-10, 228);

  // Nouveau rôle
  drawDot(ctx, newRole, midX+80, 208, 22);
  ctx.fillStyle=C.yellow; ctx.font='bold 13px sans-serif'; ctx.textAlign='center';
  ctx.fillText(short(newRole.name), midX+80, 244);

  // Stats
  const sbW=(W-pad*2-10)/2, sbY=290, sbH=80;

  drawStatBox(ctx, pad, sbY, sbW, sbH);
  ctx.save(); ctx.fillStyle=C.blue; ctx.globalAlpha=0.8; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('NOUVEL ECHELON', pad+sbW/2, sbY+18); ctx.globalAlpha=1;
  ctx.fillStyle=C.yellow; ctx.font='bold 26px sans-serif';
  ctx.fillText(String(newRole.level), pad+sbW/2, sbY+48);
  ctx.globalAlpha=0.5; ctx.fillStyle=C.cream; ctx.font='8px sans-serif';
  drawDot(ctx, newRole, pad+sbW/2-26, sbY+64, 7);
  ctx.fillText(short(newRole.name), pad+sbW/2+2, sbY+68);
  ctx.restore();

  drawStatBox(ctx, pad+sbW+10, sbY, sbW, sbH);
  ctx.save(); ctx.fillStyle=C.blue; ctx.globalAlpha=0.8; ctx.font='9px sans-serif'; ctx.textAlign='center';
  ctx.fillText('XP TOTAL', pad+sbW+10+sbW/2, sbY+18); ctx.globalAlpha=1;
  ctx.fillStyle=C.yellow; ctx.font='bold 26px sans-serif';
  ctx.fillText(totalXp.toLocaleString('fr-FR'), pad+sbW+10+sbW/2, sbY+50);
  ctx.restore();

  // Barre
  const nextRole = getNextRole(totalXp);
  const xpCur = Math.max(0, totalXp - newRole.xp);
  const xpNxt = nextRole ? nextRole.xp - newRole.xp : 1;
  const barY = 392;
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.6; ctx.font='11px sans-serif'; ctx.textAlign='left';
  ctx.fillText('Progression vers '+(nextRole?nextRole.name:'niveau max'), pad, barY);
  ctx.textAlign='right';
  ctx.fillText(nextRole?xpCur.toLocaleString('fr-FR')+' / '+xpNxt.toLocaleString('fr-FR')+' XP':'MAX', W-pad, barY);
  ctx.restore();
  drawBar(ctx, pad, barY+8, W-pad*2, 6, nextRole ? xpCur/xpNxt : 1);

  // Footer
  drawLine(ctx, pad, H-52, W-pad);
  ctx.save(); ctx.fillStyle=C.cream; ctx.globalAlpha=0.35; ctx.font='9px sans-serif'; ctx.textAlign='left';
  ctx.fillText('SIEGE SOCIAL DU CANAPE  —  SERVICE RH FICTIF', pad, H-26); ctx.restore();
  drawStamp(ctx, W-pad, H-36, 'PROMU');

  return canvas.toBuffer('image/png');
}

// ─── LEVEL UP ─────────────────────────────────────────────────────────────────
async function handleLevelUp(member, channel, totalXp, oldRole, newRole) {
  const promo = member.guild.channels.cache.find(c => c.name === LEVELUP_CHANNEL) || channel;

  const discordNew = member.guild.roles.cache.find(r => r.name === ROLE_NAMES_FULL[newRole.name]);
  if (discordNew) await member.roles.add(discordNew).catch(console.error);
  if (oldRole.name !== newRole.name) {
    const discordOld = member.guild.roles.cache.find(r => r.name === ROLE_NAMES_FULL[oldRole.name]);
    if (discordOld) await member.roles.remove(discordOld).catch(console.error);
  }

  try {
    const img = await drawLevelUpCard(member, totalXp, oldRole, newRole);
    await promo.send({ files: [new AttachmentBuilder(img, { name: 'levelup.png' })] });
    const fullName = ROLE_NAMES_FULL[newRole.name] || newRole.emoji + ' ' + newRole.name;
    await promo.send(`**>>>** Nouveau grade debloque — **${fullName}**. Le canape a parle.`);
  } catch (err) {
    console.error('Erreur carte level up:', err);
    await promo.send(`🎉 **${member.displayName}** vient d'atteindre **${newRole.emoji} ${newRole.name}** !`);
  }
}

// ─── CLIENT ───────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

const commands = [
  new SlashCommandBuilder().setName('profil').setDescription('Affiche ta fiche RH')
    .addUserOption(o => o.setName('membre').setDescription("Voir le profil d'un autre membre")),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Top 10 du serveur'),
].map(c => c.toJSON());

client.once('ready', async () => {
  console.log(`🤖 Connecte en tant que ${client.user.tag}`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Commandes slash enregistrees.');
  } catch (e) { console.error(e); }
});

// ─── XP MESSAGE ───────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;
  const uid = message.author.id;
  const now = Date.now();
  if (now - (msgCooldowns.get(uid)||0) < 60_000) return;
  msgCooldowns.set(uid, now);

  const u = getUser(uid);
  const oldRole = getRoleForXp(u.xp);
  u.xp += Math.floor(Math.random()*26)+15;
  saveXp();
  const newRole = getRoleForXp(u.xp);

  if (newRole.level > oldRole.level) {
    const member = await message.guild.members.fetch(uid).catch(()=>null);
    if (member) await handleLevelUp(member, message.channel, u.xp, oldRole, newRole);
  }
});

// ─── XP REACTION ──────────────────────────────────────────────────────────────
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (reaction.message.author?.id === user.id) return;
  const now = Date.now();
  if (now - (reactCooldowns.get(user.id)||0) < 30_000) return;
  reactCooldowns.set(user.id, now);
  const guild = reaction.message.guild;
  if (!guild) return;

  const u = getUser(user.id);
  const oldRole = getRoleForXp(u.xp);
  u.xp += Math.floor(Math.random()*3)+1;
  saveXp();
  const newRole = getRoleForXp(u.xp);

  if (newRole.level > oldRole.level) {
    const member = await guild.members.fetch(user.id).catch(()=>null);
    if (member) await handleLevelUp(member, reaction.message.channel, u.xp, oldRole, newRole);
  }
});

// ─── INTERACTIONS ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'profil') {
    await interaction.deferReply();
    const target = interaction.options.getUser('membre') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id).catch(()=>null);
    if (!member) return interaction.editReply('Membre introuvable.');
    const u = getUser(target.id);
    try {
      const img = await drawProfileCard(member, u.xp);
      await interaction.editReply({ files: [new AttachmentBuilder(img, { name: 'profil.png' })] });
    } catch (err) {
      console.error('Erreur carte profil:', err);
      const role = getRoleForXp(u.xp);
      await interaction.editReply(`**${member.displayName}** — ${role.emoji} ${role.name} — ${u.xp} XP`);
    }
  }

  if (interaction.commandName === 'leaderboard') {
    const sorted = Object.entries(xpData).sort((a,b)=>b[1].xp-a[1].xp).slice(0,10);
    if (!sorted.length) return interaction.reply("Aucun XP enregistre pour l'instant !");
    const lines = await Promise.all(sorted.map(async ([id, data], i) => {
      const m = await interaction.guild.members.fetch(id).catch(()=>null);
      const name = m ? m.displayName : 'Inconnu';
      const role = getRoleForXp(data.xp);
      return `**#${i+1}** ${name} — ${role.emoji} ${role.name} — ${data.xp} XP`;
    }));
    const embed = new EmbedBuilder()
      .setColor(0xFFE48C)
      .setTitle('🏆 Classement — Les Irrécupérables')
      .setDescription(lines.join('\n'))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
});

client.login(TOKEN);

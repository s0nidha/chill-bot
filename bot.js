const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// --- 1. INITIALISATION DU BOT ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- 2. GESTION DU FICHIER DE SAUVEGARDE JSON ---
const DB_FILE = path.join(__dirname, 'database.json');

// Charger les données
function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}));
    return {};
  }
  try {
    const rawData = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error("Erreur de lecture du fichier JSON :", error);
    return {};
  }
}

// Sauvegarder les données
function saveData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Erreur d'écriture du fichier JSON :", error);
  }
}

let db = loadData();

// --- 3. ÉVÉNEMENT READY & COMMANDES SLASH ---
client.once('ready', async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag} !`);

  const commands = [
    new SlashCommandBuilder()
      .setName('profil')
      .setDescription('Affiche votre profil et votre niveau d\'XP')
      .addUserOption(option => 
        option.setName('utilisateur')
          .setDescription('L\'utilisateur dont vous voulez voir le profil')
          .setRequired(false)),

    new SlashCommandBuilder()
      .setName('leaderboard')
      .setDescription('Affiche le classement du serveur')
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Commandes slash enregistrées.');
  } catch (error) {
    console.error('❌ Erreur d\'enregistrement des commandes :', error);
  }
});

// --- 4. GAIN D'XP VIA LES MESSAGES ---
const COOLDOWN_MS = 60000; // 1 minute entre chaque gain d'XP
const cooldowns = new Map();

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const key = `${guildId}_${userId}`;
  const now = Date.now();

  // Clé unique pour chaque utilisateur du serveur
  if (!db[guildId]) db[guildId] = {};
  if (!db[guildId][userId]) {
    db[guildId][userId] = { xp: 0, level: 1 };
  }

  const user = db[guildId][userId];
  const lastMsg = cooldowns.get(key) || 0;

  if (now - lastMsg > COOLDOWN_MS) {
    cooldowns.set(key, now);

    // Gain de 15 à 25 XP
    const xpGained = Math.floor(Math.random() * 11) + 15;
    user.xp += xpGained;

    // Palier de niveau = niveau * 100
    const nextLevelXp = user.level * 100;
    if (user.xp >= nextLevelXp) {
      user.level += 1;
      message.channel.send(`🎉 Félicitations ${message.author}, tu es passé au **niveau ${user.level}** !`);
    }

    saveData(db);
  }
});

// --- 5. COMMANDES /PROFIL ET /LEADERBOARD ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  const guildId = interaction.guild.id;

  // COMMAND /PROFIL
  if (commandName === 'profil') {
    const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
    const userData = db[guildId]?.[targetUser.id] || { xp: 0, level: 1 };

    const xp = userData.xp;
    const level = userData.level;
    const nextLevelXp = level * 100;

    const embed = new EmbedBuilder()
      .setTitle(`Profil de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor('#5865F2')
      .addFields(
        { name: 'Niveau', value: `${level}`, inline: true },
        { name: 'XP Total', value: `${xp} XP`, inline: true },
        { name: 'Objectif Niveau Suivant', value: `${xp} / ${nextLevelXp} XP`, inline: false }
      )
      .setFooter({ text: 'Chill-Bot System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // COMMAND /LEADERBOARD
  if (commandName === 'leaderboard') {
    const serverData = db[guildId] || {};
    
    // Trier les utilisateurs du serveur par Niveau puis XP
    const sortedUsers = Object.entries(serverData)
      .map(([id, data]) => ({ userId: id, ...data }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (sortedUsers.length === 0) {
      return interaction.reply({ content: 'Aucun utilisateur classé pour le moment.', ephemeral: true });
    }

    let description = '';
    sortedUsers.forEach((u, index) => {
      description += `**#${index + 1}** <@${u.userId}> — Niveau **${u.level}** (${u.xp} XP)\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Classement XP - ${interaction.guild.name}`)
      .setColor('#FEE75C')
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
});

// --- 6. LOG IN ---
client.login(process.env.DISCORD_TOKEN);

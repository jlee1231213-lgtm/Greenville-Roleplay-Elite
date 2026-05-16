const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');

const activeStartupSessions = new Map();
const startupCooldowns = new Map();
const STARTUP_COOLDOWN_MS = 20 * 60 * 1000;
const STARTUP_REACTION_EMOJI_ID = '1504244806803783717';
const STARTUP_REACTION_EMOJI_TAG = 'GVH_beatinghearts:1504244806803783717';

const DEFAULT_STARTUP_EMBED = {
  title: '## <a:GVH_beatinghearts:1504244806803783717>   *__Greenville Hub — Startup__* <a:GVH_beatinghearts:1504244806803783717>',
  description: `<a:animatedarrow:1500579646725558352>  {{user}} is currently hosting a **Greenville Hub session**. Before joining, please make sure you have reviewed the information in the ⁠**Comminty Dropdowns** channel and carefully read all guidelines listed below.\n\n<a:GVH_animatedarrow:1504244827062010131> In order for this session to officially begin, we must reach **__{{reactions}}+__ reactions** on this startup message.\n\n<a:animatedarrow:1500968506114572359>  Review the **Restricted Vehicles List** to avoid any rule violations.\n<a:animatedarrow:1500968506114572359>  Make sure all of your vehicles are properly registered using the Greenville Hub system bot!\n<a:animatedarrow:1500968506114572359>  Enable your Roblox privacy settings so that **'Everyone' can invite you to private servers!**`,
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1502813547971874866/image.png?ex=6a0113ae&is=69ffc22e&hm=98d9ab691999e7822a7e00df0cdac135ffa45f20a447148cc4503ef157753efc&=&format=webp&quality=lossless&width=1992&height=720'
};

function normalizeBranding(text) {
  if (!text) return text;
  return text
    .replace(/Greenville Roleplaye? Elite/gi, 'Greenville Hub')
    .replace(/<:dot:1500584469906591971>|:dot:/g, '<a:GVH_animatedarrow:1504244827062010131>');
}

function applyStartupTokens(text, userId, now, reactionsRequired) {
  if (!text) return text;
  return normalizeBranding(text)
    .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
    .replace(/\{\{date\}\}|\$date/g, now.toLocaleString())
    .replace(/\{\{reactions\}\}|\$reactions/g, String(reactionsRequired));
}

function formatCooldown(msRemaining) {
  const totalSeconds = Math.max(1, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('startup')
    .setDescription('Start a session')
    .addIntegerOption(option =>
      option.setName('reactions')
        .setDescription('Amount of reactions needed to start')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    let settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Settings not found' });

    const staffRoleId = settings.staffRoleId;
    if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role' });
    }

    const startupCooldownUntil = startupCooldowns.get(interaction.user.id);
    if (startupCooldownUntil && startupCooldownUntil > Date.now()) {
      return interaction.editReply({
        content: `You can use /startup again in ${formatCooldown(startupCooldownUntil - Date.now())}.`,
      });
    }

    const reactionsRequired = interaction.options.getInteger('reactions');
    const userId = interaction.user.id;
    const now = new Date();
    const embedColor = '#4C7C58';

    const startupTemplate = settings.startupEmbed || DEFAULT_STARTUP_EMBED;
    const setupTemplate = settings.setupEmbed || {};

    let embedDescription = applyStartupTokens(startupTemplate.description, userId, now, reactionsRequired) || 'Data was not found, please use `/settings` to configure the Embed';
    embedDescription = embedDescription.replace(/@everyone/g, '');
    const embed = new EmbedBuilder()
      .setTitle(applyStartupTokens(startupTemplate.title, userId, now, reactionsRequired) || 'Data not found')
      .setDescription(embedDescription)
      .setColor(embedColor)
      .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

    if (startupTemplate.image && startupTemplate.image.startsWith('http')) embed.setImage(startupTemplate.image);

    const message = await interaction.channel.send({ content: '@everyone', embeds: [embed] });
    await message.react(STARTUP_REACTION_EMOJI_TAG).catch(() => null);

    startupCooldowns.set(interaction.user.id, Date.now() + STARTUP_COOLDOWN_MS);

    const sessionId = uuidv4();
    activeStartupSessions.set(sessionId, { userId, timestamp: now, type: 'session', messageId: message.id });

    await StartupSession.create({ guildId: interaction.guild.id, channelId: interaction.channel.id, messageId: message.id, createdAt: now });

    await interaction.editReply({ content: 'Session started successfully.', flags: MessageFlags.Ephemeral });

    const filter = (reaction, user) => reaction.emoji.id === STARTUP_REACTION_EMOJI_ID && !user.bot;
    const collector = message.createReactionCollector({ filter, max: reactionsRequired, time: 1000 * 60 * 60 }); 

    collector.on('collect', async () => {
      if (message.reactions.cache.get(STARTUP_REACTION_EMOJI_ID)?.count - 1 >= reactionsRequired) {
        collector.stop();

        const setupTitle = normalizeBranding(setupTemplate.title || '').trim();
        const setupDescription = normalizeBranding(setupTemplate.description || 'Data was not found, please use `/settings` to configure the Embed')
          .replace(/\{\{user\}\}|\{user\}|\$user/g, `<@${userId}>`)
          .replace(/\\n/g, '\n');
        const setupEndsAt = Math.floor((Date.now() + 10 * 60 * 1000) / 1000);

        const finalDescription = setupTitle.startsWith('##')
          ? `${setupTitle}\n${setupDescription}`
          : setupDescription;

        const setupEmbed = new EmbedBuilder()
          .setDescription(finalDescription)
          .setColor(embedColor)
          .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' });

        setupEmbed.addFields({
          name: 'Setup Time Window',
          value: `Please give the host 10 minutes to setup. Expected ready time: <t:${setupEndsAt}:R>`,
          inline: false,
        });

        if (setupTitle && !setupTitle.startsWith('##')) {
          setupEmbed.setTitle(setupTitle);
        }

        if (setupTemplate.image && setupTemplate.image.startsWith('http')) setupEmbed.setImage(setupTemplate.image);

        await message.reply({ embeds: [setupEmbed] });
      }
    });

    collector.on('end', collected => {
      console.log(`Reaction collector ended. Total collected: ${collected.size}`);
    });
  }
};

module.exports.activeStartupSessions = activeStartupSessions;
module.exports.startupCooldowns = startupCooldowns;

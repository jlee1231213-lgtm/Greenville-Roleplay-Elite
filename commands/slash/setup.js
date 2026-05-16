const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const StartupSession = require('../../models/startupsession');
const { activeStartupSessions } = require('./startup');

const DEFAULT_SETUP_EMBED = {
  title: '<a:loading:1500587786649211051> *__Greenville Hub - Session Preparation!__* <a:loading:1500587786649211051>',
  description: '<a:GVH_animatedarrow:1504244827062010131> {user} is officially setting up their session! While you wait for **EA & Release**, make sure you registered a **vehicle**. Please don\'t ping the host during this time, setup takes time.',
  image: null,
};

function normalizeEmbedText(text) {
  if (!text) return text;
  return text
    .replace(/Greenville Roleplaye? Elite/gi, 'Greenville Hub')
    .replace(/<:dot:1500584469906591971>|:dot:/g, '<a:GVH_animatedarrow:1504244827062010131>');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Send a session preparation message'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (settings) {
      const staffRoleId = settings.staffRoleId;
      if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
        return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
      }
    }

    const userId = interaction.user.id;

    let replyTarget = null;
    const startupFromDb = await StartupSession.findOne({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
    if (startupFromDb) {
      try {
        const startupChannel = await interaction.client.channels.fetch(startupFromDb.channelId);
        if (startupChannel?.isTextBased?.()) {
          replyTarget = await startupChannel.messages.fetch(startupFromDb.messageId).catch(() => null);
        }
      } catch {
        replyTarget = null;
      }
    }

    if (!replyTarget) {
      const latestStartup = [...activeStartupSessions.entries()]
        .filter(([, data]) => data.type === 'session')
        .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

      if (latestStartup) {
        const [, startupData] = latestStartup;
        if (startupData.messageId) {
          try {
            replyTarget = await interaction.channel.messages.fetch(startupData.messageId);
          } catch {
            replyTarget = null;
          }
        }
      }
    }

    const setupTemplate = settings?.setupEmbed || DEFAULT_SETUP_EMBED;
    const setupTitle = normalizeEmbedText(setupTemplate.title || DEFAULT_SETUP_EMBED.title || '').trim();
    const setupDescription = normalizeEmbedText(setupTemplate.description || DEFAULT_SETUP_EMBED.description)
      .replace(/\{\{user\}\}|\{user\}|\$user/g, `<@${userId}>`)
      .replace(/\\n/g, '\n');
    const setupEndsAt = Math.floor((Date.now() + 10 * 60 * 1000) / 1000);

    // Discord does not render markdown headings in embed titles. If title starts with ##,
    // move it into the description so the heading styling works.
    const finalDescription = setupTitle.startsWith('##')
      ? `${setupTitle}\n${setupDescription}`
      : setupDescription;

    const setupEmbed = new EmbedBuilder()
      .setDescription(finalDescription)
      .setColor('#4C7C58')
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    setupEmbed.addFields({
      name: 'Setup Time Window',
      value: `Please give the host 10 minutes to setup. Expected ready time: <t:${setupEndsAt}:R>`,
      inline: false,
    });

    if (setupTitle && !setupTitle.startsWith('##')) {
      setupEmbed.setTitle(setupTitle);
    }

    if (setupTemplate.image?.startsWith('http')) {
      setupEmbed.setImage(setupTemplate.image);
    }

    try {
      if (replyTarget?.reply) await replyTarget.reply({ embeds: [setupEmbed] });
      else await interaction.channel.send({ embeds: [setupEmbed] });
    } catch {
      return interaction.editReply({
        content: 'I do not have access to post setup in that channel. Please check channel permissions.',
      });
    }

    await interaction.editReply({ content: 'Setup message sent.' });
  },
};

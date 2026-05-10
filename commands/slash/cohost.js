const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');
const StartupSession = require('../../models/startupsession');
const { activeStartupSessions } = require('./startup');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_COHOST_EMBED = {
  title: '## <a:beatinghearts:1500587804445638897>  *__Greenville Roleplay Elite - Session Co-host__* <a:beatinghearts:1500587804445638897>',
  description: '<:dot:1500584469906591971> {{user}} is co-hosting the current session, please redirect to co-host for any concerns or questions, if host isnt available.',
  image: null,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cohost')
    .setDescription('Cohost a session'),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';
    const allowedRoleId = settings?.staffRoleId;
    if (!allowedRoleId || !interaction.member.roles.cache.has(allowedRoleId)) return interaction.editReply({ content: 'No permission' });
    const userId = interaction.user.id;
    const timestamp = new Date();
    const sessionId = uuidv4();
    activeStartupSessions.set(sessionId, { userId, timestamp, type: 'cohost' });

    let replyTarget = null;

    const startupFromDb = await StartupSession.findOne({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
    if (startupFromDb) {
      try {
        const startupChannel = await interaction.client.channels.fetch(startupFromDb.channelId);
        replyTarget = await startupChannel.messages.fetch(startupFromDb.messageId);
      } catch {
        replyTarget = null;
      }
    }

    if (!replyTarget) {
      const latestStartup = [...activeStartupSessions.entries()]
        .filter(([id, data]) => data.type === 'session')
        .sort((a, b) => b[1].timestamp - a[1].timestamp)[0];

      if (latestStartup) {
        const [id, data] = latestStartup;
        if (data.messageId) {
          try {
            replyTarget = await interaction.channel.messages.fetch(data.messageId);
          } catch {
            replyTarget = null;
          }
        }
      }
    }

    const cohostTemplate = settings?.cohostEmbed || DEFAULT_COHOST_EMBED;
    const cohostEmbed = new EmbedBuilder()
      .setTitle(cohostTemplate.title || DEFAULT_COHOST_EMBED.title)
      .setDescription(
        (cohostTemplate.description || DEFAULT_COHOST_EMBED.description)
          .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
      )
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (cohostTemplate.image?.startsWith('http')) cohostEmbed.setImage(cohostTemplate.image);

    if (replyTarget && replyTarget.reply) await replyTarget.reply({ embeds: [cohostEmbed] });
    else await interaction.channel.send({ embeds: [cohostEmbed] });

    await interaction.editReply({ content: 'Cohost registered successfully.' });
  }
};
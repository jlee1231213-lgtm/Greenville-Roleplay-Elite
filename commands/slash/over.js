const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ComponentType,
} = require('discord.js');
const SessionLog = require('../../models/sessionlog');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');
const { activeStartupSessions } = require('../slash/startup');

const overCooldowns = new Map();
const OVER_COOLDOWN_MS = 20 * 60 * 1000;

const DEFAULT_OVER_EMBED = {
  title: '## <a:beatinghearts:1500587804445638897> *__Greenville Roleplay Elite  - Session Concluded!__* <a:beatinghearts:1500587804445638897>',
  description: '<:dot:1500584469906591971> {{user}} has officially **concluded the current session!** If there was issues within the session, feel free to open a ticket! Ensure you maximize your fun within the session!\n\n> `Start Time:` {{starttime}}\n> `End time:` {{endtime}}\n> Additional Notes: {{notes}}',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1502813548508745898/image.png?ex=6a0113ae&is=69ffc22e&hm=b629081c0601212faea30a418d85fc2ffc457541d1a3e64d69300c9571f30c01&=&format=webp&quality=lossless&width=1800&height=652',
};

function formatDateTime(date) {
  const timestamp = Math.floor(new Date(date).getTime() / 1000);
  return `<t:${timestamp}:F>`;
}

function clip(value, max = 1024) {
  if (!value) return 'N/A';
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function normalizeTemplateText(text) {
  if (!text) return text;
  return text.replace(/\\n/g, '\n');
}

function formatCooldown(msRemaining) {
  const totalSeconds = Math.max(1, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

async function purgeChannelExceptPinned(channel) {
  if (!channel?.isTextBased?.()) return 0;

  let deletedCount = 0;
  let before;
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

  while (true) {
    const messages = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
    if (!messages.size) break;

    const nonPinned = messages.filter(msg => !msg.pinned);
    const now = Date.now();
    const recentIds = [];
    const oldMessages = [];

    for (const message of nonPinned.values()) {
      if (now - message.createdTimestamp < fourteenDaysMs) recentIds.push(message.id);
      else oldMessages.push(message);
    }

    if (recentIds.length) {
      const bulkDeleted = await channel.bulkDelete(recentIds, true).catch(() => null);
      deletedCount += bulkDeleted?.size || 0;
    }

    for (const message of oldMessages) {
      const removed = await message.delete().then(() => 1).catch(() => 0);
      deletedCount += removed;
    }

    before = messages.last()?.id;
    if (!before) break;
  }

  return deletedCount;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('over')
    .setDescription('Conclude the current session')
    .addStringOption(option =>
      option
        .setName('notes')
        .setDescription('Additional notes for this session conclusion')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

    if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
      return interaction.editReply({
        content: 'You do not have the required role to use this command.',
      });
    }

    const overCooldownUntil = overCooldowns.get(interaction.user.id);
    if (overCooldownUntil && overCooldownUntil > Date.now()) {
      return interaction.editReply({
        content: `You can use /over again in ${formatCooldown(overCooldownUntil - Date.now())}.`,
      });
    }

    const userId = interaction.user.id;
    const note = interaction.options.getString('notes') || 'None provided.';

    const sessionEntry = [...activeStartupSessions.entries()].find(
      ([, data]) => data.userId === userId && data.type === 'session'
    );

    if (!sessionEntry) {
      return interaction.editReply({
        content: 'No active session found for you.',
      });
    }

    const [sessionId, sessionData] = sessionEntry;
    const endTime = new Date();

    await SessionLog.create({
      guildId: interaction.guild.id,
      sessiontype: sessionData.type,
      sessionId,
      userId: sessionData.userId,
      timestarted: sessionData.timestamp,
      timeended: endTime,
    });

    activeStartupSessions.delete(sessionId);
    overCooldowns.set(interaction.user.id, Date.now() + OVER_COOLDOWN_MS);
    const overTemplate = settings?.overEmbed || DEFAULT_OVER_EMBED;

    const descriptionTemplate = normalizeTemplateText(overTemplate.description || DEFAULT_OVER_EMBED.description);
    const cooldownUntil = new Date(Date.now() + OVER_COOLDOWN_MS);

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(overTemplate.title || DEFAULT_OVER_EMBED.title)
      .setDescription(
        descriptionTemplate
          .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
          .replace(/\{\{starttime\}\}|\$starttime/g, formatDateTime(sessionData.timestamp))
          .replace(/\{\{endtime\}\}|\$endtime/g, formatDateTime(endTime))
          .replace(/\{\{notes\}\}|\$notes/g, note)
      )
      .addFields(
        { name: 'Next Session Available', value: `<t:${Math.floor(cooldownUntil.getTime() / 1000)}:R>`, inline: false }
      )
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });
    if (overTemplate.image?.startsWith('http')) embed.setImage(overTemplate.image);

    const feedbackCustomId = `over_feedback_${sessionId}`;
    const feedbackButton = new ButtonBuilder()
      .setCustomId(feedbackCustomId)
      .setLabel('Feedback Form')
      .setStyle(ButtonStyle.Success);
    const actionRow = new ActionRowBuilder().addComponents(feedbackButton);

    let startupChannel = interaction.channel;
    const startupFromDb = await StartupSession.findOne({ guildId: interaction.guild.id }).sort({ createdAt: -1 });
    if (startupFromDb) {
      try {
        const fetchedChannel = await interaction.client.channels.fetch(startupFromDb.channelId);
        if (fetchedChannel?.isTextBased?.()) startupChannel = fetchedChannel;
      } catch {
        startupChannel = interaction.channel;
      }
    }

    await purgeChannelExceptPinned(startupChannel);

    const sessionEndedMessage = await startupChannel.send({ embeds: [embed], components: [actionRow] });

    const collector = sessionEndedMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 1000 * 60 * 60,
    });

    collector.on('collect', async buttonInteraction => {
      try {
        if (buttonInteraction.customId !== feedbackCustomId) return;

        const modalId = `over_feedback_modal_${sessionId}`;
        const modal = new ModalBuilder()
          .setCustomId(modalId)
          .setTitle('Session Feedback Form')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('rating_input')
                .setLabel('What would you rate the Session 0-10?')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('session_input')
                .setLabel('How was the Session?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('reason_input')
                .setLabel('Why did you give them this rating?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );

        await buttonInteraction.showModal(modal);

        let modalSubmit;
        try {
          modalSubmit = await buttonInteraction.awaitModalSubmit({
            filter: m => m.customId === modalId && m.user.id === buttonInteraction.user.id,
            time: 1000 * 60 * 5,
          });
        } catch {
          return;
        }

        const rawRating = modalSubmit.fields.getTextInputValue('rating_input').trim();
        const ratingNumber = Number(rawRating);
        if (!Number.isFinite(ratingNumber) || ratingNumber < 0 || ratingNumber > 10) {
          await modalSubmit.reply({
            content: 'Please submit a valid rating between 0 and 10.',
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const howWasSession = modalSubmit.fields.getTextInputValue('session_input').trim();
        const reason = modalSubmit.fields.getTextInputValue('reason_input').trim();

        let logChannel;
        try {
          logChannel = await interaction.client.channels.fetch(settings?.logChannelId || '1419318345731411968');
        } catch {
          logChannel = null;
        }

        const feedbackEmbed = new EmbedBuilder()
          .setTitle('Session Feedback Submitted')
          .setColor(embedColor)
          .addFields(
            { name: 'Host', value: `<@${userId}>`, inline: true },
            { name: 'Submitted By', value: `<@${modalSubmit.user.id}>`, inline: true },
            { name: 'Rating', value: `${ratingNumber}/10`, inline: true },
            { name: 'How was the Session?', value: clip(howWasSession) },
            { name: 'Why this rating?', value: clip(reason) }
          )
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp();

        if (logChannel) {
          await logChannel.send({ embeds: [feedbackEmbed] });
        } else {
          await interaction.channel.send({ embeds: [feedbackEmbed] });
        }

        await modalSubmit.reply({
          content: `Thanks for the feedback! Your response has been logged for <@${userId}>.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch {
        if (!buttonInteraction.replied && !buttonInteraction.deferred) {
          await buttonInteraction.reply({
            content: 'There was an error opening the feedback form. Please try again.',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
      }
    });

    return interaction.editReply({
      content: `Session concluded successfully. Purged non-pinned messages in <#${startupChannel.id}>.`,
    });
  },
};

module.exports.overCooldowns = overCooldowns;

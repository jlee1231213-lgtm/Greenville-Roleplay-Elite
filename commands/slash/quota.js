const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const Quota = require('../../models/quota');

const MAX_LOGS_PER_USER = 20;
const POINT_VALUES = {
  host: 2,
  cohost: 1,
  partnership: 0.5,
  supervise: 1,
};

function hasAllowedRole(interaction, settings) {
  const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);
  if (!allowedRoleIds.length) return false;
  return interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id));
}

function clampNonNegative(value) {
  return Math.max(0, value);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quota')
    .setDescription('Manage and view staff quota data')
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the quota Top 5 leaderboard')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('summary')
        .setDescription('View quota summary for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to view quota summary for')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add quota points to a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to add points to')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to add')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for adding quota')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove quota points from a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to remove points from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option.setName('amount')
            .setDescription('Amount to remove')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for removing quota')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset quota points')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to reset (leave empty to reset all)')
            .setRequired(false)
        )
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for reset')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('log')
        .setDescription('View recent quota logs for a user')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('User to view logs for')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!hasAllowedRole(interaction, settings)) {
      return interaction.editReply({ content: 'You do not have permission to use this command.' });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const embedColor = settings?.embedcolor || '#368f4c';

    if (subcommand === 'leaderboard') {
      const topFive = await Quota.find({ guildId }).sort({ amount: -1, updatedAt: 1 }).limit(5).lean();
      const lines = [];

      for (let i = 0; i < 5; i += 1) {
        const entry = topFive[i];
        if (entry) {
          lines.push(`*__Top ${i + 1}__* <@${entry.userId}> - **${entry.amount}**`);
        } else {
          lines.push(`*__Top ${i + 1}__* N/A`);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setDescription([
          '## > :beatinghearts: *__Greenville Roleplay Elite - Quota Top 5 Leaderboard__*',
          ...lines,
        ].join('\n'));

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'summary') {
      const user = interaction.options.getUser('user') || interaction.user;
      const quotaDoc = await Quota.findOne({ guildId, userId: user.id }).lean();
      const amount = quotaDoc?.amount || 0;
      const totalLogs = quotaDoc?.logs?.length || 0;

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle('Quota Summary')
        .setDescription(`<@${user.id}> currently has **${amount}** quota points.`)
        .addFields({ name: 'Log Entries', value: String(totalLogs), inline: true });

      return interaction.editReply({ embeds: [embed] });
    }

    if (subcommand === 'add') {
      const user = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const reason = interaction.options.getString('reason') || 'No reason provided.';

      const updated = await Quota.findOneAndUpdate(
        { guildId, userId: user.id },
        {
          $inc: { amount },
          $push: {
            logs: {
              $each: [{
                action: 'add',
                amount,
                reason,
                moderatorId: interaction.user.id,
                createdAt: new Date(),
              }],
              $slice: -MAX_LOGS_PER_USER,
            },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return interaction.editReply({
        content: `Added **${amount}** quota point(s) to <@${user.id}>. New total: **${updated.amount}**.`,
      });
    }

    if (subcommand === 'remove') {
      const user = interaction.options.getUser('user', true);
      const amount = interaction.options.getInteger('amount', true);
      const reason = interaction.options.getString('reason') || 'No reason provided.';

      const existing = await Quota.findOne({ guildId, userId: user.id });
      if (!existing) {
        return interaction.editReply({ content: 'That user has no quota record yet.' });
      }

      existing.amount = clampNonNegative(existing.amount - amount);
      existing.logs.push({
        action: 'remove',
        amount,
        reason,
        moderatorId: interaction.user.id,
        createdAt: new Date(),
      });
      if (existing.logs.length > MAX_LOGS_PER_USER) {
        existing.logs = existing.logs.slice(-MAX_LOGS_PER_USER);
      }
      await existing.save();

      return interaction.editReply({
        content: `Removed **${amount}** quota point(s) from <@${user.id}>. New total: **${existing.amount}**.`,
      });
    }

    if (subcommand === 'reset') {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided.';

      if (user) {
        const record = await Quota.findOne({ guildId, userId: user.id });
        if (!record) {
          return interaction.editReply({ content: 'That user has no quota record yet.' });
        }

        const previous = record.amount;
        record.amount = 0;
        record.logs.push({
          action: 'reset',
          amount: previous,
          reason,
          moderatorId: interaction.user.id,
          createdAt: new Date(),
        });
        if (record.logs.length > MAX_LOGS_PER_USER) {
          record.logs = record.logs.slice(-MAX_LOGS_PER_USER);
        }
        await record.save();

        return interaction.editReply({
          content: `Reset quota for <@${user.id}>. Previous total was **${previous}**.`,
        });
      }

      const allRecords = await Quota.find({ guildId });
      for (const record of allRecords) {
        const previous = record.amount;
        record.amount = 0;
        record.logs.push({
          action: 'reset',
          amount: previous,
          reason,
          moderatorId: interaction.user.id,
          createdAt: new Date(),
        });
        if (record.logs.length > MAX_LOGS_PER_USER) {
          record.logs = record.logs.slice(-MAX_LOGS_PER_USER);
        }
        await record.save();
      }

      return interaction.editReply({ content: `Reset quota for **${allRecords.length}** user(s).` });
    }

    if (subcommand === 'log') {
      const user = interaction.options.getUser('user', true);
      const quotaDoc = await Quota.findOne({ guildId, userId: user.id }).lean();
      const logs = quotaDoc?.logs || [];
      const currentPoints = quotaDoc?.amount || 0;

      if (!logs.length) {
        return interaction.editReply({ content: `No quota logs found for <@${user.id}>.` });
      }

      const lastLog = logs[logs.length - 1];
      const pointsAdded = lastLog?.amount || 0;

      const logEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setDescription([
          '## > <a:beatinghearts:1500587804445638897> *__Greenville Roleplay Elite - Quota logged!__* <a:beatinghearts:1500587804445638897>',
          `<a:animatedarrow:1500968506114572359> <@${user.id}> has logged (${lastLog?.reason || 'No reason'})`,
          `<a:animatedarrow:1500968506114572359> Current points: **${currentPoints}**`,
          `<a:animatedarrow:1500968506114572359> Added points: **${pointsAdded}**`,
        ].join('\n'));

      const logChannel = interaction.guild.channels.cache.get(settings?.logChannelId);
      if (logChannel?.isTextBased?.()) {
        await logChannel.send({ embeds: [logEmbed] }).catch(() => null);
      }

      const recentLogs = [...logs].slice(-10).reverse();
      const formatted = recentLogs.map((entry, index) => {
        const timestamp = Math.floor(new Date(entry.createdAt).getTime() / 1000);
        return `${index + 1}. **${entry.action.toUpperCase()}** ${entry.amount} by <@${entry.moderatorId}> <t:${timestamp}:R>\nReason: ${entry.reason}`;
      }).join('\n\n');

      const profileEmbed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`Quota Logs - ${user.tag}`)
        .setDescription(formatted);

      return interaction.editReply({ embeds: [profileEmbed] });
    }

    return interaction.editReply({ content: 'Invalid quota subcommand.' });
  },
};

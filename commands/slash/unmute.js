const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove a timeout (unmute) from a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to unmute')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for unmuting')
        .setRequired(false)),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.reply({ content: 'Server settings not found.', flags: MessageFlags.Ephemeral });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You must have the Staff role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.reply({ content: 'User not found in the server.', flags: MessageFlags.Ephemeral });
    if (!guildMember.isCommunicationDisabled()) return interaction.reply({ content: 'That user is not currently muted.', flags: MessageFlags.Ephemeral });

    await guildMember.timeout(null, reason);

    const embedColor = '#368f4c';

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'unmute', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Unmuted')
      .setDescription(`<@${target.id}>'s timeout has been removed.`)
      .setColor(embedColor)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

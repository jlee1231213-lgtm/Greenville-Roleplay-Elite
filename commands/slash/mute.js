const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to mute')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('duration')
        .setDescription('Duration in minutes')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the mute')
        .setRequired(true)),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.reply({ content: 'Server settings not found.', flags: MessageFlags.Ephemeral });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You must have the Staff role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason');
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.reply({ content: 'User not found in the server.', flags: MessageFlags.Ephemeral });
    if (!guildMember.moderatable) return interaction.reply({ content: 'I cannot mute that user.', flags: MessageFlags.Ephemeral });

    const ms = duration * 60 * 1000;
    await guildMember.timeout(ms, reason);

    const embedColor = '#368f4c';

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'mute', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Muted')
      .setDescription(`<@${target.id}> has been muted for **${duration} minute(s)**.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(embedColor)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

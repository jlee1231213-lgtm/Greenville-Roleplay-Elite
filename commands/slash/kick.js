const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(true)),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.reply({ content: 'Server settings not found.', flags: MessageFlags.Ephemeral });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You must have the Staff role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const guildMember = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!guildMember) return interaction.reply({ content: 'User not found in the server.', flags: MessageFlags.Ephemeral });
    if (!guildMember.kickable) return interaction.reply({ content: 'I cannot kick that user.', flags: MessageFlags.Ephemeral });

    const embedColor = '#368f4c';

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Kicked`)
      .setDescription(`You have been kicked from **${interaction.guild.name}**.\n\n> **Reason**: ${reason}\n> **Moderator**: <@${interaction.user.id}>`)
      .setColor(embedColor)
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => null);
    await guildMember.kick(reason);

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'kick', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Kicked')
      .setDescription(`<@${target.id}> has been kicked from the server.`)
      .setColor(embedColor)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

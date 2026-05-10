const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');
const ModLog = require('../../models/modlogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to warn')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for the warning')
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
    const embedColor = '#368f4c';

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Warning`)
      .setDescription(`You have received a warning in **${interaction.guild.name}**.\n\n> **Reason**: ${reason}\n> **Moderator**: <@${interaction.user.id}>`)
      .setColor(embedColor)
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'warn', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Warned')
      .setDescription(`<@${target.id}> has been warned.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(embedColor)
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};

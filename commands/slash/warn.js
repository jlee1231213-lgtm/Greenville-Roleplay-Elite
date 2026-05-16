const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { greenvilleFooter } = require('../../utils/embedFooter');
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
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    if (!settings) return interaction.editReply({ content: 'Server settings not found.' });

    const staffRoleId = settings.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
    }

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');
    const embedColor = '#4C7C58';

    const dmEmbed = new EmbedBuilder()
      .setTitle(`${interaction.guild.name} | Warning`)
      .setDescription(`You have received a warning in **${interaction.guild.name}**.\n\n> **Reason**: ${reason}\n> **Moderator**: <@${interaction.user.id}>`)
      .setColor(embedColor)
      .setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    await target.send({ embeds: [dmEmbed] }).catch(() => null);

    await ModLog.create({ userId: interaction.user.id, targetId: target.id, reason, type: 'warn', date: new Date() });

    const embed = new EmbedBuilder()
      .setTitle('User Warned')
      .setDescription(`<@${target.id}> has been warned.`)
      .addFields({ name: 'Reason', value: reason })
      .setColor(embedColor)
      .setFooter(greenvilleFooter(interaction))
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

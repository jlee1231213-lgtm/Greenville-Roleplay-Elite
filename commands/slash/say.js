const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message in this channel.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });

    const staffRoleId = settings?.staffRoleId;
    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: 'You must have the Staff role to use this command.', flags: MessageFlags.Ephemeral });
    }

    const message = interaction.options.getString('message');
    await interaction.channel.send({ content: message });
    return interaction.reply({ content: 'Message sent.', flags: MessageFlags.Ephemeral });
  },
};

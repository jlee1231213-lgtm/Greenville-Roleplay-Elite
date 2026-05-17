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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });

    const adminRoleId = settings?.adminRoleId;
    if (!adminRoleId || !interaction.member.roles.cache.has(adminRoleId)) {
      return interaction.editReply({ content: 'You must have the Admin role to use this command.' });
    }

    const message = interaction.options.getString('message');
    await interaction.channel.send({ content: message });
    return interaction.editReply({ content: 'Message sent.' });
  },
};

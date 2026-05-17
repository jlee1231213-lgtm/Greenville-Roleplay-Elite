const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const SAY_COMMAND_ROLE_ID = '1502674328951455866';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message in this channel.')
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(interaction.user.id);

    if (!member.roles.cache.has(SAY_COMMAND_ROLE_ID)) {
      return interaction.editReply({ content: 'You do not have the required role to use this command.' });
    }

    const message = interaction.options.getString('message');
    await interaction.channel.send({ content: message });
    return interaction.editReply({ content: 'Message sent.' });
  },
};

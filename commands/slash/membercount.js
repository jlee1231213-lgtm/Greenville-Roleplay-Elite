const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Display the current member count of the server.'),

  async execute(interaction) {
    await interaction.deferReply();
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';

    const guild = interaction.guild;
    await guild.members.fetch();

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;

    const embed = new EmbedBuilder()
      .setTitle(`${guild.name} — Member Count`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Total', value: `${total}`, inline: true },
        { name: 'Members', value: `${humans}`, inline: true },
        { name: 'Bots', value: `${bots}`, inline: true },
      )
      .setColor(embedColor)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

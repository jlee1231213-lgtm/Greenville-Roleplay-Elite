const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Settings = require('../../models/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('membercount')
    .setDescription('Display the current member count of the server.'),

  async execute(interaction) {
    await interaction.deferReply();
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';

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
      .setFooter({ text: 'Greenville Hub™', iconURL: 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818' })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  },
};

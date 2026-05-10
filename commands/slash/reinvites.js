const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Settings = require('../../models/settings');

const DEFAULT_REINVITES_EMBED = {
  title: '## > <a:beatinghearts:1500587804445638897>   *__Greenville Roleplay Elite - Re-invites!__* <a:beatinghearts:1500587804445638897>',
  description: '<:dot:1500584469906591971> Welcome to reinivites. Please make sure if you were late to joining the session, you react here. for this to commence this message needs **__3+ reactions!__**',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1502813571040415894/image.png?ex=6a0113b4&is=69ffc234&hm=efb531f3868add4b148fde6a1189c155f574360747fff83635f67036589c1586&=&format=webp&quality=lossless&width=2330&height=764',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvites")
    .setDescription("Post reinvites for a session"),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';
    const staffRoleId = settings?.staffRoleId;

    if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Data not found')
            .setDescription('You do not have permission to use this command or data is not configured. Please use `/settings` to configure the Embed.')
            .setColor(embedColor)
        ],
        ephemeral: true
      });
    }

    if (!interaction.client.reinviteCounters) interaction.client.reinviteCounters = new Map();
    const channelId = interaction.channelId;
    const currentCount = (interaction.client.reinviteCounters.get(channelId) || 0) + 1;
    interaction.client.reinviteCounters.set(channelId, currentCount);
    const reinvitesTemplate = settings?.reinvitesEmbed || DEFAULT_REINVITES_EMBED;

    const userToPing = interaction.user.id;

    const embed = new EmbedBuilder()
      .setTitle(reinvitesTemplate.title || DEFAULT_REINVITES_EMBED.title)
      .setDescription(reinvitesTemplate.description || DEFAULT_REINVITES_EMBED.description)
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (reinvitesTemplate.image?.startsWith('http')) embed.setImage(reinvitesTemplate.image);

    const reinviteMessage = await interaction.channel.send({ embeds: [embed] });
    await reinviteMessage.react('beatinghearts:1500587804445638897').catch(() => {});
    await interaction.reply({ content: 'Reinvites sent successfully.', ephemeral: true });

    let logChannel;
    try { logChannel = await interaction.client.channels.fetch(settings?.logChannelId || '1419318345731411968'); } catch { logChannel = null; }

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Reinvites Initiated')
        .setDescription(`Reinvites round ${currentCount} started by ${interaction.user.tag}`)
        .addFields(
          { name: 'Host', value: `<@${userToPing}>`, inline: true },
          { name: 'Channel', value: `${interaction.channel.name} (${interaction.channel.id})`, inline: true },
          { name: 'Message Link', value: `[Jump to Message](${reinviteMessage.url})`, inline: true },
          { name: 'Reinvite Count', value: `Round ${currentCount}`, inline: true }
        )
        .setColor(embedColor)
        .setTimestamp();

      logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
};

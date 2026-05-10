const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Settings = require('../../models/settings');

const DEFAULT_REINVITES_EMBED = {
  title: '## > :beatinghearts: *__Greenville Roleplay Elite - Re-invites Released__*',
  description: ':animatedarrow: {{user}} has released reinvites. If you missed the gran opening, please join by clicking the button below!\n\n:animatedarrow: FRP Speed: {{frplimit}}\n:animatedarrow: LEO Status: {{pt}}\n:animatedarrow: Host: {{user}}\n:animatedarrow: Session link: {{link}}',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1503075550858711070/image.png?ex=6a0207b1&is=6a00b631&hm=ab6a788a316838df91aa02a88559f60bb33686d1adb90e09b5cbca1e7d9ae821&=&format=webp&quality=lossless&width=2330&height=764',
};

function applyReinvitesTokens(text, userId, ptStatus, frpLimit, sessionLink) {
  if (!text) return text;
  return text
    .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
    .replace(/\{\{pt\}\}|\$pt/g, ptStatus)
    .replace(/\{\{frplimit\}\}|\$frplimit/g, frpLimit)
    .replace(/\{\{link\}\}|\$link/g, sessionLink)
    .replace(/\\n/g, '\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvites")
    .setDescription("Post reinvites for a session")
    .addStringOption(option =>
      option.setName("link")
        .setDescription("Private server link")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("pt")
        .setDescription("LEO status")
        .setRequired(true)
        .addChoices(
          { name: 'Strict', value: 'Strict' },
          { name: 'On', value: 'On' },
          { name: 'Off', value: 'Off' }
        ))
    .addStringOption(option =>
      option.setName("frplimit")
        .setDescription("FRP speed limit")
        .setRequired(true)
        .addChoices(
          { name: '65MPH', value: '65MPH' },
          { name: '75MPH', value: '75MPH' },
          { name: '85MPH', value: '85MPH' }
        )),

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
    const sessionLink = interaction.options.getString('link');
    const ptStatus = interaction.options.getString('pt');
    const frpLimit = interaction.options.getString('frplimit');
    const reinvitesTemplate = DEFAULT_REINVITES_EMBED;

    const userToPing = interaction.user.id;

    const embed = new EmbedBuilder()
      .setTitle(
        applyReinvitesTokens(
          reinvitesTemplate.title || DEFAULT_REINVITES_EMBED.title,
          interaction.user.id,
          ptStatus,
          frpLimit,
          sessionLink
        )
      )
      .setDescription(
        applyReinvitesTokens(
          reinvitesTemplate.description || DEFAULT_REINVITES_EMBED.description,
          interaction.user.id,
          ptStatus,
          frpLimit,
          sessionLink
        )
      )
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

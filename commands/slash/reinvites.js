const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const { greenvilleFooter } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');

const DEFAULT_REINVITES_EMBED = {
  title: '## <a:GVH_beatinghearts:1504244806803783717> *__Greenville Hub - Re-invites Released__*',
  description: '<a:GVH_animatedarrow:1504244827062010131> {{user}} has released reinvites. If you missed the gran opening, please join by clicking the button below!\n\n<a:GVH_animatedarrow:1504244827062010131> FRP Speed: {{frplimit}}\n<a:GVH_animatedarrow:1504244827062010131> LEO Status: {{pt}}\n<a:GVH_animatedarrow:1504244827062010131> Host: {{user}}\n<a:GVH_animatedarrow:1504244827062010131> Session link: {{link}}',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1503075550858711070/image.png?ex=6a0207b1&is=6a00b631&hm=ab6a788a316838df91aa02a88559f60bb33686d1adb90e09b5cbca1e7d9ae821&=&format=webp&quality=lossless&width=2330&height=764',
};

function applyReinvitesTokens(text, userId, ptStatus, frpLimit, sessionLink) {
  if (!text) return text;
  return text
    .replace(/Greenville Roleplaye? Elite/gi, 'Greenville Hub')
    .replace(/<:dot:1500584469906591971>|:dot:/g, '<a:GVH_animatedarrow:1504244827062010131>')
    .replace(/\{\{user\}\}|\$user/g, `<@${userId}>`)
    .replace(/\{\{pt\}\}|\$pt/g, ptStatus)
    .replace(/\{\{frplimit\}\}|\$frplimit/g, frpLimit)
    .replace(/\{\{link\}\}|\$link/g, sessionLink)
    .replace(/\\n/g, '\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvites")
    .setDescription("Post reinvites for a session"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';
    const staffRoleId = settings?.staffRoleId;

    if (!staffRoleId || !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Data not found')
            .setDescription('You do not have permission to use this command or data is not configured. Please use `/settings` to configure the Embed.')
            .setColor(embedColor)
            .setFooter(greenvilleFooter(interaction))
        ],
      });
    }

    if (!interaction.client.reinviteCounters) interaction.client.reinviteCounters = new Map();
    const channelId = interaction.channelId;
    const currentCount = (interaction.client.reinviteCounters.get(channelId) || 0) + 1;
    interaction.client.reinviteCounters.set(channelId, currentCount);
    const sessionLink = 'N/A';
    const ptStatus = 'N/A';
    const frpLimit = 'N/A';
    const reinvitesTemplate = settings?.reinvitesEmbed || DEFAULT_REINVITES_EMBED;

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
      .setFooter(greenvilleFooter(interaction));

    if (reinvitesTemplate.image?.startsWith('http')) embed.setImage(reinvitesTemplate.image);

    const reinviteMessage = await interaction.channel.send({ embeds: [embed] });
    await reinviteMessage.react('GVH_beatinghearts:1504244806803783717').catch(() => {});
    await interaction.editReply({ content: 'Reinvites sent successfully.', flags: MessageFlags.Ephemeral });

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

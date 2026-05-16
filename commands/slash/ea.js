const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ComponentType, ButtonStyle } = require('discord.js');
const { greenvilleFooter } = require('../../utils/embedFooter');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');

const EA_WHITELIST_ROLE_IDS = [
  '1503044187455619228',
  '1503044125430255626',
  '1503044009797619983',
  '1501214256442380470',
  '1503898816145789050'
];
const STARTUP_REACTION_EMOJI_ID = '1504244806803783717';

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ea")
    .setDescription("Post early access for a session")
    .addStringOption(option =>
      option.setName("link")
        .setDescription("The link to the private server")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#4C7C58';

    const allowedRoleIds = EA_WHITELIST_ROLE_IDS.filter(roleId => interaction.guild.roles.cache.has(roleId));

    const rawSessionLink = interaction.options.getString('link').trim();
    const candidateLink = /^https?:\/\//i.test(rawSessionLink) ? rawSessionLink : `https://${rawSessionLink}`;

    let sessionLink;
    try {
      const parsedUrl = new URL(candidateLink);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
      sessionLink = parsedUrl.toString();
    } catch {
      await interaction.editReply({
        content: 'Invalid link. Please provide a valid URL (example: https://example.com).'
      });
      return;
    }

    const userMention = `<@${interaction.user.id}>`;
    const whitelistMentions = allowedRoleIds.map(roleId => `<@&${roleId}>`).join(' ');

    const button = new ButtonBuilder().setCustomId('get_ealink').setLabel('Session Link').setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(button);

    const eaEmbed = new EmbedBuilder()
      .setTitle('<a:GVH_beatinghearts:1504244806803783717>  *__Greenville Hub - Early Access__*  <a:GVH_beatinghearts:1504244806803783717>')
      .setDescription(`<a:GVH_animatedarrow:1504244827062010131> ${userMention} has released **Early Access.** If you have reacted, and have permission to join, please click the button below.\n\n> <a:GVH_animatedarrow:1504244827062010131> Reminder; leaking this link will result in a **termination** alongside **moderation.**`)
      .setColor(embedColor)
      .setImage('https://media.discordapp.net/attachments/1492958669200031814/1505028855126294669/image.png?ex=6a0922d9&is=6a07d159&hm=d2fb8cea8f623d86f30dbf5d1d337082b328f50434f76184744175f215292b05&=&format=webp&quality=lossless&width=2294&height=464')
      .setFooter(greenvilleFooter(interaction));

    const earlyAccessMessage = await interaction.channel.send({
      content: whitelistMentions || null,
      embeds: [eaEmbed],
      components: [row],
      allowedMentions: { roles: allowedRoleIds }
    });
    await interaction.editReply({ content: 'Early access message sent successfully.' });

    let logChannel;
    try { logChannel = settings?.logChannelId ? await interaction.client.channels.fetch(settings.logChannelId) : null; } catch { logChannel = null; }

    if (logChannel) {
      logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('Early Access Command Executed')
            .setDescription(`Early access was initiated by ${interaction.user.tag}`)
            .addFields(
              { name: 'Channel', value: `${interaction.channel.name} (${interaction.channel.id})`, inline: true },
              { name: 'Message Link', value: `[Jump to Message](${earlyAccessMessage.url})`, inline: true },
              { name: 'Link Provided', value: sessionLink }
            )
            .setColor(embedColor)
            .setTimestamp()
        ]
      });
    }

    const collector = earlyAccessMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3600000 });
    collector.on('collect', async i => {
      if (!i.member.roles.cache.some(r => allowedRoleIds.includes(r.id))) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('You do not have the required role.').setColor(embedColor).setFooter(greenvilleFooter(interaction))],
          ephemeral: true
        });
      }

      const startup = await StartupSession.findOne({ guildId: i.guild.id }).sort({ createdAt: -1 });
      if (!startup) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message not found. Please ask a host to initiate one.').setColor(embedColor).setFooter(greenvilleFooter(interaction))],
          ephemeral: true
        });
      }

      const startupChannel = await interaction.client.channels.fetch(startup.channelId);
      const startupMsg = await startupChannel.messages.fetch(startup.messageId).catch(() => null);
      if (!startupMsg) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message no longer exists.').setColor(embedColor).setFooter(greenvilleFooter(interaction))],
          ephemeral: true
        });
      }

      const reaction = startupMsg.reactions.cache.get(STARTUP_REACTION_EMOJI_ID);
      if (!reaction || !(await reaction.users.fetch()).has(i.user.id)) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Reaction Required')
              .setDescription(`You must react to the [startup message](https://discord.com/channels/${i.guild.id}/${startup.channelId}/${startup.messageId}) to get access.`)
              .setColor(embedColor)
              .setFooter(greenvilleFooter(interaction))
          ],
          ephemeral: true
        });
      }

      await i.reply({
        embeds: [new EmbedBuilder().setDescription(`Click here to join the session:\n${sessionLink}`).setColor(embedColor).setFooter(greenvilleFooter(interaction))],
        ephemeral: true
      });

      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Early Access Link Used')
              .setDescription(`<@${i.user.id}> used the EA button in <#${interaction.channel.id}>`)
              .setColor(embedColor)
          ]
        });
      }
    });
  }
};

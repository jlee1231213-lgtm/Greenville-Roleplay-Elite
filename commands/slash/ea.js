const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ComponentType, ButtonStyle } = require('discord.js');
const StartupSession = require('../../models/startupsession');
const Settings = require('../../models/settings');

const EA_WHITELIST_ROLE_IDS = [
  '1503044187455619228',
  '1503044125430255626',
  '1503044009797619983',
  '1501214256442380470'
];

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
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const embedColor = '#368f4c';

    const allowedRoleIds = EA_WHITELIST_ROLE_IDS;

    await interaction.deferReply({ ephemeral: true });

    const sessionLink = interaction.options.getString('link');
    const userMention = `<@${interaction.user.id}>`;
    const whitelistMentions = allowedRoleIds.map(roleId => `<@&${roleId}>`).join(' ');
    const eaMessageBody = [
      '## > <a:beatinghearts:1500587804445638897> *__Greenville Roleplay Elite - Early Access__* <a:beatinghearts:1500587804445638897>',
      `<a:animatedarrow:1500968506114572359> ${userMention} has released **Early Access.** If you have reacted, and have permission to join, please click the button below.`,
      '',
      '> <a:animatedarrow:1500968506114572359> Reminder; leaking this link will result in a **termination** alongside **moderation.**'
    ].join('\n');

    const button = new ButtonBuilder().setCustomId('get_ealink').setLabel('Get Link').setStyle(ButtonStyle.Success);
    const row = new ActionRowBuilder().addComponents(button);

    const earlyAccessMessage = await interaction.channel.send({
      content: `${whitelistMentions}\n\n${eaMessageBody}`,
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
          embeds: [new EmbedBuilder().setDescription('You do not have the required role.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const startup = await StartupSession.findOne({ guildId: i.guild.id }).sort({ createdAt: -1 });
      if (!startup) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message not found. Please ask a host to initiate one.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const startupChannel = await interaction.client.channels.fetch(startup.channelId);
      const startupMsg = await startupChannel.messages.fetch(startup.messageId).catch(() => null);
      if (!startupMsg) {
        return i.reply({
          embeds: [new EmbedBuilder().setDescription('Startup message no longer exists.').setColor(embedColor)],
          ephemeral: true
        });
      }

      const reaction = startupMsg.reactions.cache.get('✅');
      if (!reaction || !(await reaction.users.fetch()).has(i.user.id)) {
        return i.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Reaction Required')
              .setDescription(`You must react to the [startup message](https://discord.com/channels/${i.guild.id}/${startup.channelId}/${startup.messageId}) to get access.`)
              .setColor(embedColor)
          ],
          ephemeral: true
        });
      }

      await i.reply({
        embeds: [new EmbedBuilder().setDescription(`[Click here to join the session](${sessionLink})`).setColor(embedColor)],
        ephemeral: true
      });

      if (logChannel) {
        logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('Early Access Link Used')
              .setDescription(`<@${i.user.id}> used the EA button in <#${interaction.channel.id}>`)
              .setColor(embedColor)
              .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          ]
        });
      }
    });
  }
};

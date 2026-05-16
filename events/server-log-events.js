const { Events, EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');

async function getLogChannel(guild) {
  if (!guild) return null;

  const settings = await Settings.findOne({ guildId: guild.id }).lean().catch(() => null);
  if (!settings?.logChannelId) return null;

  const cached = guild.channels.cache.get(settings.logChannelId);
  if (cached?.isTextBased?.()) return cached;

  const fetched = await guild.channels.fetch(settings.logChannelId).catch(() => null);
  if (fetched?.isTextBased?.()) return fetched;

  return null;
}

async function sendLog(guild, embed) {
  const channel = await getLogChannel(guild);
  if (!channel) return;
  await channel.send({ embeds: [embed] }).catch(() => null);
}

function clampText(text, max = 900) {
  if (!text) return 'No content';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.on(Events.MessageDelete, async (message) => {
      if (!message.guild) return;
      if (message.author?.bot) return;

      if (message.partial) {
        await message.fetch().catch(() => null);
      }

      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Message Deleted')
        .addFields(
          { name: 'User', value: message.author ? `<@${message.author.id}>` : 'Unknown', inline: true },
          { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
          { name: 'Content', value: clampText(message.content || 'No text content'), inline: false }
        )
        .setTimestamp();

      await sendLog(message.guild, embed);
    });

    client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
      if (!newMessage.guild) return;
      if (newMessage.author?.bot) return;

      if (oldMessage.partial) {
        await oldMessage.fetch().catch(() => null);
      }
      if (newMessage.partial) {
        await newMessage.fetch().catch(() => null);
      }

      const before = oldMessage.content || '';
      const after = newMessage.content || '';
      if (before === after) return;

      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Message Edited')
        .addFields(
          { name: 'User', value: newMessage.author ? `<@${newMessage.author.id}>` : 'Unknown', inline: true },
          { name: 'Channel', value: `<#${newMessage.channel.id}>`, inline: true },
          { name: 'Before', value: clampText(before || 'No content'), inline: false },
          { name: 'After', value: clampText(after || 'No content'), inline: false }
        )
        .setTimestamp();

      await sendLog(newMessage.guild, embed);
    });

    client.on(Events.GuildMemberAdd, async (member) => {
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Member Joined')
        .addFields(
          { name: 'User', value: `<@${member.id}>`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await sendLog(member.guild, embed);
    });

    client.on(Events.GuildMemberRemove, async (member) => {
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Member Left')
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: false }
        )
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      await sendLog(member.guild, embed);
    });

    client.on(Events.ChannelCreate, async (channel) => {
      if (!channel.guild) return;
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Channel Created')
        .addFields(
          { name: 'Channel', value: `${channel.name} (${channel.id})`, inline: false }
        )
        .setTimestamp();

      await sendLog(channel.guild, embed);
    });

    client.on(Events.ChannelDelete, async (channel) => {
      if (!channel.guild) return;
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Channel Deleted')
        .addFields(
          { name: 'Channel', value: `${channel.name || 'Unknown'} (${channel.id})`, inline: false }
        )
        .setTimestamp();

      await sendLog(channel.guild, embed);
    });

    client.on(Events.GuildBanAdd, async (ban) => {
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Member Banned')
        .addFields(
          { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: false }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp();

      await sendLog(ban.guild, embed);
    });

    client.on(Events.GuildBanRemove, async (ban) => {
      const embed = new EmbedBuilder()
        .setColor('#4C7C58')
        .setTitle('Member Unbanned')
        .addFields(
          { name: 'User', value: `${ban.user.tag} (${ban.user.id})`, inline: false }
        )
        .setThumbnail(ban.user.displayAvatarURL())
        .setTimestamp();

      await sendLog(ban.guild, embed);
    });
  },
};

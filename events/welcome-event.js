const { EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');

const DEFAULT_WELCOME_EMBED = {
  title: '## > <a:beatinghearts:1503548942904983552>  *__Greenville Roleplay Elite - Warm Welcomes!__* <a:beatinghearts:1503548942904983552>',
  description: '<a:animatedarrow:1503548961892601887>  Welcome to **Greenville Roleplay Elite** {user}! To become a verified civilian, use `/verify` in <#1500626032959422694>! Ensure to check our <#1500663198293037076> channel to enter some great **giveaways!**\n\n> <a:animatedarrow:1503548961892601887> Furthermore, in need of assistance? Don\'t be scared to open a ticket in <#1500623825409278003>!\n-# Have a great stay!',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1503549418656370828/image.png?ex=6a03c104&is=6a026f84&hm=8b2a5fd5359d0047363bddda6a9095ab5c08806e377ec6fb83dec1b9388b5dc5&=&format=webp&quality=lossless&width=2334&height=654',
};

function applyWelcomeTokens(text, memberId) {
  if (!text) return text;
  return text
    .replace(/\{user\}|\$user/g, `<@${memberId}>`)
    .replace(/\$date/g, new Date().toLocaleDateString())
    .replace(/\\n/g, '\n');
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    if (!member.guild) return;

    const settings = await Settings.findOne({ guildId: member.guild.id });
    if (!settings || !settings.welcomechannelid) return;

    const channel = member.guild.channels.cache.get(settings.welcomechannelid);
    if (!channel) return;

    const embedData = settings.welcomeEmbed || DEFAULT_WELCOME_EMBED;
    const color = '#1a3e88';

    const title = applyWelcomeTokens(embedData.title || DEFAULT_WELCOME_EMBED.title, member.id);
    const description = applyWelcomeTokens(embedData.description || DEFAULT_WELCOME_EMBED.description, member.id);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description)
      .setThumbnail(member.displayAvatarURL());

    if ((embedData.image || DEFAULT_WELCOME_EMBED.image)?.startsWith('http')) {
      embed.setImage(embedData.image || DEFAULT_WELCOME_EMBED.image);
    }

    channel.send({ embeds: [embed] }).catch(() => {});
  }
};

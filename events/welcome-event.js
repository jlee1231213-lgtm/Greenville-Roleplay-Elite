const { EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');

const DEFAULT_WELCOME_EMBED = {
  title: '## > <:Beige_flying_star:1500584694859694252> *__Greenville Roleplay Elite - Warm Welcomes!__*',
  description: '<:dot:1500584469906591971> Welcome to **Greenville Roleplay Elite** {user}! To become a verified civilian, use `/verify` in <#1500626032959422694>! Ensure to check our <#1500663198293037076> channel to enter some great **giveaways!**\n\n> <:dasharrow:1500584579721990155> Furthermore, in need of assistance? Dont be scared to open a ticket in <#1500623825409278003>!\n-# Have a great stay!',
  image: 'https://media.discordapp.net/attachments/1502790559486705755/1503083504353935621/Screenshot_20260509_094523_Discord.png?ex=6a020f19&is=6a00bd99&hm=e85c3454b61707ea9c93a4b892f233069dee61061f2c778297f71a1157a05744&=&format=webp&quality=lossless&width=2160&height=798',
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
    const color = '#368f4c';

    const title = applyWelcomeTokens(embedData.title || DEFAULT_WELCOME_EMBED.title, member.id);
    const description = applyWelcomeTokens(embedData.description || DEFAULT_WELCOME_EMBED.description, member.id);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(description);

    if ((embedData.image || DEFAULT_WELCOME_EMBED.image)?.startsWith('http')) {
      embed.setImage(embedData.image || DEFAULT_WELCOME_EMBED.image);
    }

    channel.send({ embeds: [embed] }).catch(() => {});
  }
};

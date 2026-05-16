const { EmbedBuilder } = require('discord.js');
const Settings = require('../models/settings');

const DEFAULT_WELCOME_CHANNEL_ID = '1500619986295722014';

const DEFAULT_WELCOME_EMBED = {
  title: '# > <a:GVH_beatinghearts:1504244806803783717> *Greenville Hub - __Warm Welcomes__* <a:GVH_beatinghearts:1504244806803783717>',
  description: '<a:GVH_animatedarrow:1504244827062010131> Welcome to **__Greenville Hub™__** {user}! Please make sure you are verified by running the `/verify` command in <#1500626032959422694> using "Dyno". Please ensure you have read over our informative, found in <#1500620852633272350>!\n\n> <a:GVH_animatedarrow:1504244827062010131> Furthermore, requiring assistance? Simple, open a ticket in <#1500623825409278003>!',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1505270658794258552/image.png?ex=6a0a040b&is=6a08b28b&hm=d736c9464ba8b938aa4a1ddaa3183d706a943ad9d56bf37f083d7ab8c9aaee32&=&format=webp&quality=lossless&width=2352&height=728',
};

const LEGACY_WELCOME_EMBED = {
  title: '## > <a:beatinghearts:1503548942904983552>  *__Greenville Hub - Warm Welcomes!__* <a:beatinghearts:1503548942904983552>',
  description: '<a:animatedarrow:1503548961892601887>  Welcome to **Greenville Hub** {user}! To become a verified civilian, use `/verify` in <#1500626032959422694>! Ensure to check our <#1500663198293037076> channel to enter some great **giveaways!**\n\n> <a:animatedarrow:1503548961892601887> Furthermore, in need of assistance? Don\'t be scared to open a ticket in <#1500623825409278003>!\n-# Have a great stay!',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1503549418656370828/image.png?ex=6a03c104&is=6a026f84&hm=8b2a5fd5359d0047363bddda6a9095ab5c08806e377ec6fb83dec1b9388b5dc5&=&format=webp&quality=lossless&width=2334&height=654',
};

const LEGACY_WELCOME_TITLE_MARKERS = [
  '<a:beatinghearts:1503873058073481316>',
  '<a:beatinghearts:1503548942904983552>',
];

const LEGACY_WELCOME_DESCRIPTION_MARKERS = [
  '<a:animatedarrow:1503873075010211943>',
  '<a:animatedarrow:1503548961892601887>',
];

const LEGACY_WELCOME_IMAGES = [
  'https://media.discordapp.net/attachments/1492895569927077921/1502667820977094837/Screenshot_20260509_094523_Discord.jpg?ex=6a048076&is=6a032ef6&hm=e80b0725b0957423c3d5740a2c780e53af2d0e7958a3fdd49bb75008d775598e&=&format=webp&width=2160&height=798',
  LEGACY_WELCOME_EMBED.image,
];

function normalizeBranding(text) {
  if (!text) return text;
  return text.replace(/Greenville Roleplaye? Elite/gi, 'Greenville Hub');
}

function isLegacyWelcomeValue(value, legacyValue, markers = []) {
  return !value || value === legacyValue || markers.some(marker => value.includes(marker));
}

function resolveWelcomeEmbed(savedEmbed) {
  if (!savedEmbed) return DEFAULT_WELCOME_EMBED;

  return {
    title: isLegacyWelcomeValue(savedEmbed.title, LEGACY_WELCOME_EMBED.title, LEGACY_WELCOME_TITLE_MARKERS)
      ? DEFAULT_WELCOME_EMBED.title
      : savedEmbed.title,
    description: isLegacyWelcomeValue(savedEmbed.description, LEGACY_WELCOME_EMBED.description, LEGACY_WELCOME_DESCRIPTION_MARKERS)
      ? DEFAULT_WELCOME_EMBED.description
      : savedEmbed.description,
    image: !savedEmbed.image || LEGACY_WELCOME_IMAGES.includes(savedEmbed.image)
      ? DEFAULT_WELCOME_EMBED.image
      : savedEmbed.image,
  };
}

function applyWelcomeTokens(text, memberId) {
  if (!text) return text;
  return normalizeBranding(text)
    .replace(/\{user\}|\$user/g, `<@${memberId}>`)
    .replace(/\$date/g, new Date().toLocaleDateString())
    .replace(/\\n/g, '\n');
}

function applyWelcomeContent(embed, title, description) {
  if (title?.trim().startsWith('#')) {
    return embed.setDescription(`${title}\n${description || ''}`);
  }

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member) {
    if (!member.guild) return;

    const settings = await Settings.findOne({ guildId: member.guild.id });

    const channelId = settings?.welcomechannelid || DEFAULT_WELCOME_CHANNEL_ID;
    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const embedData = resolveWelcomeEmbed(settings?.welcomeEmbed);
    const color = '#1a3e88';

    const title = applyWelcomeTokens(embedData.title || DEFAULT_WELCOME_EMBED.title, member.id);
    const description = applyWelcomeTokens(embedData.description || DEFAULT_WELCOME_EMBED.description, member.id);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setThumbnail(member.displayAvatarURL());
    applyWelcomeContent(embed, title, description);

    if ((embedData.image || DEFAULT_WELCOME_EMBED.image)?.startsWith('http')) {
      embed.setImage(embedData.image || DEFAULT_WELCOME_EMBED.image);
    }

    channel.send({ embeds: [embed] }).catch(() => {});
  }
};

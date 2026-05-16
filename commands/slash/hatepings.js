const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { greenvilleFooter } = require("../../utils/embedFooter");
const Settings = require('../../models/settings');

const DEFAULT_HATEPINGS_EMBED = {
  title: '## <:Beige_flying_star:1500584694859694252> *__Greenville Hub - Hate Pings__* <:Beige_flying_star:1500584694859694252>',
  description: '<a:GVH_animatedarrow:1504244827062010131> Hate the constant pings? Mute this channel using the tutorial below!\n\n> :dasharrow: Requesting a partnership? Open a ticket in Greenville Hub support-tickets!',
  image: 'https://media.discordapp.net/attachments/1492895569927077921/1502685577605287997/image.png?ex=6a009c80&is=69ff4b00&hm=5d1ef5414cae0538c0b2a270060fa57d063268ba35ea4891efe942ff836e6959&=&format=webp&quality=lossless&width=2292&height=636',
};

function normalizeEmbedText(text) {
  if (!text) return text;
  return text
    .replace(/Greenville Roleplaye? Elite/gi, 'Greenville Hub')
    .replace(/<:dot:1500584469906591971>|:dot:/g, '<a:GVH_animatedarrow:1504244827062010131>');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hatepings')
    .setDescription('Post the hate pings info embed.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const staffRoleId = settings?.staffRoleId;
    const hatePingsTemplate = settings?.hatepingsEmbed || DEFAULT_HATEPINGS_EMBED;

    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.editReply({ content: 'You must have the Staff role to use this command.' });
    }

    const embed = new EmbedBuilder()
      .setColor('#4C7C58')
      .setTitle(normalizeEmbedText(hatePingsTemplate.title || DEFAULT_HATEPINGS_EMBED.title))
      .setDescription(normalizeEmbedText(hatePingsTemplate.description || DEFAULT_HATEPINGS_EMBED.description).replace(/\\n/g, '\n'))
      .setFooter(greenvilleFooter(interaction));

    if (hatePingsTemplate.image?.startsWith('http')) embed.setImage(hatePingsTemplate.image);

    await interaction.channel.send({ embeds: [embed] });
    return interaction.editReply({ content: 'Hate pings embed sent.' });
  },
};

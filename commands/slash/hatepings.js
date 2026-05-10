const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Settings = require('../../models/settings');

const DEFAULT_HATEPINGS_EMBED = {
  title: '<:Beige_flying_star:1500584694859694252> *__Greenville Roleplay Elite - Hate Pings__* <:Beige_flying_star:1500584694859694252>',
  description: ':dot: Hate the constant pings? Mute this channel using the tutorial below!\n\n> :dasharrow: Requesting a partnership? Open a ticket in Greenville Roleplay Elite support-tickets!',
  image: 'https://media.discordapp.net/attachments/1492895569927077921/1502685577605287997/image.png?ex=6a009c80&is=69ff4b00&hm=5d1ef5414cae0538c0b2a270060fa57d063268ba35ea4891efe942ff836e6959&=&format=webp&quality=lossless&width=2292&height=636',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hatepings')
    .setDescription('Post the hate pings info embed.'),

  async execute(interaction) {
    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const staffRoleId = settings?.staffRoleId;
    const hatePingsTemplate = DEFAULT_HATEPINGS_EMBED;

    if (staffRoleId && !interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: 'You must have the Staff role to use this command.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#368f4c')
      .setTitle(hatePingsTemplate.title || DEFAULT_HATEPINGS_EMBED.title)
      .setDescription((hatePingsTemplate.description || DEFAULT_HATEPINGS_EMBED.description).replace(/\\n/g, '\n'));

    if (hatePingsTemplate.image?.startsWith('http')) embed.setImage(hatePingsTemplate.image);

    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: 'Hate pings embed sent.', flags: MessageFlags.Ephemeral });
  },
};

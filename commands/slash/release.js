const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Settings = require('../../models/settings');

const DEFAULT_RELEASE_EMBED = {
  title: '## > <a:beatinghearts:1500587804445638897>  *__Greenville Roleplay Elite - Session Released!__* <a:beatinghearts:1500587804445638897>',
  description: '<:dot:1500584469906591971> {{user}} has offically released his session. If you reacted, upon joining please park until further notices. Please wait or expect a delay in the members joining.\n\n<a:animatedarrow:1500968506114572359>  FRP Speed: {{frplimit}}\n<a:animatedarrow:1500968506114572359> LEO Status: {{pt}}\n<a:animatedarrow:1500968506114572359> Host: {{user}}\n<a:animatedarrow:1500968506114572359> Session link: {{link}}',
  image: 'https://media.discordapp.net/attachments/1492958669200031814/1502813548236111892/image.png?ex=6a0113ae&is=69ffc22e&hm=d499cd0ed6f25c701eeeb4b32a925e587c4a9b393b97114477f3b8c2495cfed2&=&format=webp&quality=lossless&width=1450&height=540',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("release")
    .setDescription("Release a session")
    .addStringOption(option =>
      option.setName("link")
        .setDescription("Private server link")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("pt")
        .setDescription("PT status")
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
            .setDescription(`You do not have the required role to use this command or data is not configured. Please use \`/settings\` to configure the Embed.`)
            .setColor(embedColor)
        ],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const sessionLink = interaction.options.getString('link');
    const ptStatus = interaction.options.getString('pt');
    const frpLimit = interaction.options.getString('frplimit');
    const releaseTemplate = settings?.releaseEmbed || DEFAULT_RELEASE_EMBED;

    const embed = new EmbedBuilder()
      .setTitle(releaseTemplate.title || DEFAULT_RELEASE_EMBED.title)
      .setDescription(
        (releaseTemplate.description || DEFAULT_RELEASE_EMBED.description)
          .replace(/\{\{user\}\}|\$user/g, `<@${interaction.user.id}>`)
          .replace(/\{\{pt\}\}|\$pt/g, ptStatus)
          .replace(/\{\{frplimit\}\}|\$frplimit/g, frpLimit)
          .replace(/\{\{link\}\}|\$link/g, sessionLink)
      )
      .setColor(embedColor)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

    if (releaseTemplate.image?.startsWith('http')) embed.setImage(releaseTemplate.image);

    await interaction.channel.send({
      content: "@everyone",
      embeds: [embed]
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setDescription(`Session has been released successfully.`)
          .setColor(embedColor)
      ]
    });

  }
};

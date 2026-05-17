const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const {
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const { greenvilleFooter, GREENVILLE_FOOTER_ICON_URL } = require('../../utils/embedFooter');
const Settings = require('../../models/settings');

const DEFAULT_VOICE_CHANNEL_ID = '1500626106535907449';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join-vc')
    .setDescription('Make the bot join a voice channel.')
    .addStringOption(option =>
      option
        .setName('channel-id')
        .setDescription('The voice channel ID to join.')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const settings = await Settings.findOne({ guildId: interaction.guild.id });
    const allowedRoleIds = [settings?.staffRoleId, settings?.adminRoleId].filter(Boolean);

    if (!interaction.member.roles.cache.some(role => allowedRoleIds.includes(role.id))) {
      const errorEmbed = new EmbedBuilder()
        .setDescription('You do not have the required role to use this command.')
        .setColor('#4C7C58')
        .setThumbnail(GREENVILLE_FOOTER_ICON_URL)
        .setFooter(greenvilleFooter(interaction));
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const channelId = interaction.options.getString('channel-id') || DEFAULT_VOICE_CHANNEL_ID;
    const channel = interaction.guild.channels.cache.get(channelId)
      || await interaction.guild.channels.fetch(channelId).catch(() => null);

    if (!channel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type)) {
      const errorEmbed = new EmbedBuilder()
        .setDescription(`I could not find a voice channel with ID \`${channelId}\`.`)
        .setColor('#4C7C58')
        .setThumbnail(GREENVILLE_FOOTER_ICON_URL)
        .setFooter(greenvilleFooter(interaction));
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const permissions = channel.permissionsFor(interaction.guild.members.me);
    if (!permissions?.has(PermissionFlagsBits.ViewChannel) || !permissions?.has(PermissionFlagsBits.Connect)) {
      const errorEmbed = new EmbedBuilder()
        .setDescription(`I do not have permission to join <#${channel.id}>.`)
        .setColor('#4C7C58')
        .setThumbnail(GREENVILLE_FOOTER_ICON_URL)
        .setFooter(greenvilleFooter(interaction));
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch (error) {
      connection.destroy();
      throw error;
    }

    const successEmbed = new EmbedBuilder()
      .setDescription(`Joined <#${channel.id}>.`)
      .setColor('#4C7C58')
      .setThumbnail(GREENVILLE_FOOTER_ICON_URL)
      .setFooter(greenvilleFooter(interaction));
    return interaction.editReply({ embeds: [successEmbed] });
  },
};

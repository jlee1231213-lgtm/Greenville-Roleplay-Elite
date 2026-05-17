const { Events, ActivityType, ChannelType } = require('discord.js');
const { entersState, joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice');

const AUTO_JOIN_VOICE_CHANNEL_ID = '1500626106535907449';

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    const status = 'online';

    const activity = {
      name: 'Greenville Hub™ Sessions',
      type: ActivityType.Watching,
    };

    client.user.setPresence({
      activities: [activity],
      status: status,
    });

    console.log(`Bot is Now online as ${client.user.tag}`);

    console.log(`Presence set to: ${activity.type} ${activity.name}, status: ${status}`);

    const voiceChannel = await client.channels.fetch(AUTO_JOIN_VOICE_CHANNEL_ID).catch(() => null);
    if (!voiceChannel || ![ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(voiceChannel.type)) {
      console.log(`Auto voice join skipped. Channel ${AUTO_JOIN_VOICE_CHANNEL_ID} was not found or is not a voice channel.`);
      return;
    }

    try {
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      console.log(`Joined voice channel ${voiceChannel.name} (${voiceChannel.id}).`);
    } catch (error) {
      console.error(`Failed to join voice channel ${AUTO_JOIN_VOICE_CHANNEL_ID}:`, error.message);
    }
  },
};

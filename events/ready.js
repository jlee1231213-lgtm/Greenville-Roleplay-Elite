const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
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
  },
};
const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
  name: Events.PresenceUpdate,
  async execute(oldPresence, newPresence) {
    const { user, guild } = newPresence;
    
    // Only process guild members, not bots
    if (!user || user.bot || !guild) return;

    const supporterRoleId = '1505209789741797436';
    const channelId = '1500626032959422694';
    
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const supporterRole = guild.roles.cache.get(supporterRoleId);
    if (!supporterRole) return;

    // Check if user has the /gvhub status
    const newStatus = newPresence.activities.find(activity => activity.name === 'Custom Status')?.state || '';
    const oldStatus = oldPresence?.activities.find(activity => activity.name === 'Custom Status')?.state || '';

    const hasGvhubNew = newStatus.toLowerCase().includes('/gvhub');
    const hasGvhubOld = oldStatus.toLowerCase().includes('/gvhub');

    // User just added /gvhub status
    if (hasGvhubNew && !hasGvhubOld) {
      try {
        // Give them the role
        await member.roles.add(supporterRoleId);

        // Send the message to the channel
        const embed = new EmbedBuilder()
          .setColor('#4c7c58')
          .setDescription(`# > <a:GVH_beatinghearts:1504244806803783717> *Greenville Hub - __Server Supporters__*
<a:GVH_animatedarrow:1504244827062010131> Thank you for supporting **__Greenville Hub__** ${user} You will **__recieve__** the <@&1505209789741797436> role for putting /gvhub in you status!

> <a:GVH_animatedarrow:1504244827062010131> Want the <@&1505209789741797436> role...? Ensure to put /gvhub in your status & you will receive it!`);

        await channel.send({ embeds: [embed] });
      } catch (error) {
        console.error('Error adding supporter role:', error);
      }
    }

    // User just removed /gvhub status
    if (!hasGvhubNew && hasGvhubOld) {
      try {
        // Remove the role
        await member.roles.remove(supporterRoleId).catch(() => null);
      } catch (error) {
        console.error('Error removing supporter role:', error);
      }
    }
  }
};

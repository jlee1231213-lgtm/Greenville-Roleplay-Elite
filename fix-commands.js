/**
 * Bulk-fix: add deferReply before DB calls in all broken commands.
 * Run once then delete.
 */
const fs = require('fs');

// These need deferReply(ephemeral:true) added and reply→editReply
const ephemeralFiles = [
  'deposit.js', 'give-money.js', 'mute.js', 'unmute.js',
  'payticket.js', 'say.js', 'ticket.js', 'warrant.js',
  'reset-over-cooldown.js', 'reset-startup-cooldown.js',
  'withdraw.js', 'ticketsupport.js',
];

// These need deferReply() (non-ephemeral) added and reply→editReply
// but final success embed goes via channel.send
const publicFiles = [
  'register.js', 'unregister.js', 'membercount.js', 'balance.js', 'work.js',
];

// These already have deferReply but DB call is before it
const moveDeferFiles = [
  'cohost-end.js', 'cohost.js', 'supervise.js',
];

const dir = './commands/slash/';

function fixEphemeral(content) {
  // Add deferReply as first line of execute
  if (!content.includes('deferReply')) {
    content = content.replace(
      /async execute\(interaction\) \{/,
      `async execute(interaction) {\n    await interaction.deferReply({ ephemeral: true });`
    );
  }
  // Replace interaction.reply( with interaction.editReply(
  content = content.replace(/interaction\.reply\(/g, 'interaction.editReply(');
  // Remove ephemeral: true from editReply calls
  content = content.replace(/,\s*ephemeral:\s*true/g, '');
  content = content.replace(/ephemeral:\s*true,?\s*/g, '');
  // Remove flags: MessageFlags.Ephemeral from editReply calls
  content = content.replace(/,\s*flags:\s*MessageFlags\.Ephemeral/g, '');
  content = content.replace(/flags:\s*MessageFlags\.Ephemeral,?\s*/g, '');
  return content;
}

function fixPublic(content) {
  // Add deferReply (non-ephemeral) as first line of execute
  if (!content.includes('deferReply')) {
    content = content.replace(
      /async execute\(interaction\) \{/,
      `async execute(interaction) {\n    await interaction.deferReply();`
    );
  }
  // Replace interaction.reply( with interaction.editReply(
  content = content.replace(/interaction\.reply\(/g, 'interaction.editReply(');
  // Remove ephemeral: true (these were error replies, now they're just editReply)
  content = content.replace(/,\s*ephemeral:\s*true/g, '');
  content = content.replace(/ephemeral:\s*true,?\s*/g, '');
  content = content.replace(/ephemeral:\s*false,?\s*/g, '');
  return content;
}

function fixMoveDefer(content) {
  // Remove existing deferReply line
  content = content.replace(/\s*await interaction\.deferReply\(\{[^}]*\}\);\n?/, '\n');
  // Add deferReply before first await (DB call)
  content = content.replace(
    /async execute\(interaction\) \{/,
    `async execute(interaction) {\n    await interaction.deferReply({ ephemeral: true });`
  );
  // Change pre-defer reply calls (the ones that happened before defer) to editReply
  content = content.replace(/interaction\.reply\(/g, 'interaction.editReply(');
  content = content.replace(/,\s*ephemeral:\s*true/g, '');
  content = content.replace(/ephemeral:\s*true,?\s*/g, '');
  content = content.replace(/,\s*flags:\s*MessageFlags\.Ephemeral/g, '');
  content = content.replace(/flags:\s*MessageFlags\.Ephemeral,?\s*/g, '');
  return content;
}

// Fix ephemeral commands
for (const file of ephemeralFiles) {
  const p = dir + file;
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', file); continue; }
  let content = fs.readFileSync(p, 'utf8');
  content = fixEphemeral(content);
  fs.writeFileSync(p, content);
  console.log('Fixed ephemeral:', file);
}

// Fix public commands
for (const file of publicFiles) {
  const p = dir + file;
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', file); continue; }
  let content = fs.readFileSync(p, 'utf8');
  content = fixPublic(content);
  fs.writeFileSync(p, content);
  console.log('Fixed public:', file);
}

// Fix move-defer commands
for (const file of moveDeferFiles) {
  const p = dir + file;
  if (!fs.existsSync(p)) { console.log('SKIP (not found):', file); continue; }
  let content = fs.readFileSync(p, 'utf8');
  content = fixMoveDefer(content);
  fs.writeFileSync(p, content);
  console.log('Fixed move-defer:', file);
}

console.log('\nDone. Validating...');

// Validate all load OK
const allFiles = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let errors = [];
for (const f of allFiles) {
  try {
    delete require.cache[require.resolve(dir + f)];
    require(dir + f);
  } catch(e) {
    errors.push(f + ': ' + e.message);
  }
}
if (errors.length) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(e));
} else {
  console.log('All commands load OK!');
}

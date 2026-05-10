require("dotenv").config();
const { Client, Collection, GatewayIntentBits, REST, Routes, Partials } = require("discord.js");
const fs = require("fs");
const mongoose = require("mongoose");
const Settings = require("./models/settings");

const { token, mongodb } = process.env;

const SOURCE_GUILD_ID = "1490472044213829864";
const TARGET_GUILD_ID = "1500582461703327754";
const ENABLE_GUILD_SETTINGS_SYNC = process.env.ENABLE_GUILD_SETTINGS_SYNC === "true";
const ROLE_ID_FIELDS = ["leoRoleId", "civiRoleId", "eaRoleId", "staffRoleId", "adminRoleId", "staffingDepartmentRoleId"];

mongoose.set("bufferCommands", false);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.commandArray = [];

const connectDatabase = async () => {
  if (!mongodb) {
      throw new Error("Missing MongoDB connection string in .env (mongodb).");
  }

  await mongoose.connect(mongodb, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB successfully!");
};

const handleEvents = async () => {
  const eventFiles = fs.readdirSync("./events").filter((file) => file.endsWith(".js"));
  for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
    else client.on(event.name, (...args) => event.execute(...args, client));
  }
};

const handleCommands = async () => {
  const commandFiles = fs.readdirSync("./commands/slash").filter((file) => file.endsWith(".js"));
  console.log("Loading slash commands...");
  for (const file of commandFiles) {
    const command = require(`./commands/slash/${file}`);
    if (!command.data || !command.data.name) continue;
    client.commands.set(command.data.name, command);
    client.commandArray.push(command.data.toJSON());
    console.log(`Loaded command: ${command.data.name}`);
  }

  const clientId = process.env.clientId || Buffer.from(token.split(".")[0], "base64").toString("utf8");
  const rest = new REST({ version: "10" }).setToken(token);
  const deploymentGuildIds = [SOURCE_GUILD_ID, TARGET_GUILD_ID];

  try {
    for (const guildId of deploymentGuildIds) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: client.commandArray,
      });
      console.log(`Slash commands uploaded successfully for guild ${guildId}.`);
    }

    console.log("Available commands:");
    client.commands.forEach((cmd, name) => {
      console.log(`- ${name}`);
    });
  } catch (error) {
    console.error("Error uploading slash commands:", error.stack);
  }
};

async function syncGuildSettings(sourceGuildId, targetGuildId) {
  const sourceSettings = await Settings.findOne({ guildId: sourceGuildId }).lean();
  if (!sourceSettings) {
    console.log(`No settings found for source guild ${sourceGuildId}. Skipping sync.`);
    return;
  }

  const { _id, __v, createdAt, updatedAt, ...settingsPayload } = sourceSettings;
  settingsPayload.guildId = targetGuildId;

  await Settings.updateOne(
    { guildId: targetGuildId },
    { $set: settingsPayload },
    { upsert: true }
  );

  console.log(`Settings synced from ${sourceGuildId} to ${targetGuildId}.`);
}

async function normalizeRoleIdSettings() {
  const settingsDocs = await Settings.find({});
  let normalizedCount = 0;

  for (const doc of settingsDocs) {
    let changed = false;

    for (const field of ROLE_ID_FIELDS) {
      const rawValue = doc[field];
      if (typeof rawValue !== "string" || !rawValue.includes(",")) continue;

      const firstRoleId = rawValue
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)[0] || null;

      doc[field] = firstRoleId;
      changed = true;
    }

    if (changed) {
      await doc.save();
      normalizedCount += 1;
    }
  }

  if (normalizedCount > 0) {
    console.log(`Normalized role settings for ${normalizedCount} guild(s).`);
  }
}

client.handleEvents = handleEvents;
client.handleCommands = handleCommands;

(async () => {
  try {
    try {
      await connectDatabase();
      await normalizeRoleIdSettings();
      if (ENABLE_GUILD_SETTINGS_SYNC) {
        await syncGuildSettings(SOURCE_GUILD_ID, TARGET_GUILD_ID);
      }
    } catch (dbError) {
      console.error("MongoDB unavailable. Starting in degraded mode:", dbError.message);
    }

    await client.handleEvents();
    await client.handleCommands();
    await client.login(token);
  } catch (error) {
    console.error("Startup failed:", error);
    process.exit(1);
  }
})();

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

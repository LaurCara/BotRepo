const { Client, GatewayIntentBits, Partials,
        ActionRowBuilder, ButtonBuilder, ButtonStyle,
        EmbedBuilder, PermissionsBitField } = require("discord.js");
const express = require("express");

const GUILD_ROLE_ID = "1423071575875391558";       // rolul de menționat
const TARGET_CHANNEL_ID = "1423055839543169055";    // canalul unde postează

// --- Discord client ---
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --- Helpers ---
const roDateTag = () => `<t:${Math.floor(Date.now()/1000)}:F>`; // timestamp frumos în mesaj
const fieldValue = (v) => (v && String(v).trim().length ? v : "N/A");

// Face embedul „card” ca în poze
function buildApplicationEmbed({ nume, telefon, discord, id, mentiuni }) {
  return new EmbedBuilder()
    .setColor(0x2f3136) // dark slate / seamănă cu cardurile tale
    .setTitle("🌿 Aplicație nouă")
    .addFields(
      { name: "👤 Nume",    value: fieldValue(nume), inline: false },
      { name: "📞 Telefon", value: fieldValue(telefon), inline: true },
      { name: "🪪 Discord", value: fieldValue(discord), inline: true },
      { name: "🆔 ID",      value: fieldValue(id), inline: true },
      { name: "📝 Mențiuni", value: fieldValue(mentiuni), inline: false }
    )
    .setFooter({ text: "RAGE Programări Bot" })
    .setTimestamp(new Date());
}

// Embed „Aprobat”
function buildApprovedEmbed(byUser, payload) {
  return new EmbedBuilder()
    .setColor(0x22c55e) // verde
    .setTitle(`Aprobat de ${byUser.displayName || byUser.username}`)
    .addFields(
      { name: "👤 Nume",    value: fieldValue(payload.nume), inline: false },
      { name: "📞 Telefon", value: fieldValue(payload.telefon), inline: true },
      { name: "🪪 Discord", value: fieldValue(payload.discord), inline: true },
      { name: "🆔 ID",      value: fieldValue(payload.id), inline: true },
      { name: "📅 Data aprobării", value: roDateTag(), inline: false }
    )
    .setTimestamp(new Date());
}

// Embed „Respins”
function buildRejectedEmbed(byUser, payload) {
  return new EmbedBuilder()
    .setColor(0xef4444) // roșu
    .setTitle(`Respins de ${byUser.displayName || byUser.username}`)
    .addFields(
      { name: "👤 Nume",    value: fieldValue(payload.nume), inline: false },
      { name: "📞 Telefon", value: fieldValue(payload.telefon), inline: true },
      { name: "🪪 Discord", value: fieldValue(payload.discord), inline: true },
      { name: "🆔 ID",      value: fieldValue(payload.id), inline: true },
      { name: "📅 Data respingerii", value: roDateTag(), inline: false }
    )
    .setTimestamp(new Date());
}

// --- Web server pt. Google Apps Script ---
const app = express();
app.use(express.json());

// health
app.get("/", (_req, res) => res.status(200).send("OK"));

// primește payloadul și postează embed + butoane
app.post("/notify", async (req, res) => {
  try {
    const payload = {
      id: req.body.id ?? "",
      nume: req.body.nume ?? "",
      telefon: req.body.telefon ?? "",
      discord: req.body.discord ?? "",
      mentiuni: req.body.mentiuni ?? ""
    };

    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);

    // butoane
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("acceptat").setLabel("Aprobat ✅").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("respins").setLabel("Respins ❌").setStyle(ButtonStyle.Danger)
    );

    const embed = buildApplicationEmbed(payload);

    const message = await channel.send({
      content: `<@&${GUILD_ROLE_ID}> O persoană a aplicat!`,
      embeds: [embed],
      components: [row]
    });

    // stocăm payloadul în message pentru când se apasă butoanele
    message.appPayload = payload; // (în cache-ul clientului)
    res.status(200).send("Notificare trimisă pe Discord");
  } catch (err) {
    console.error("Eroare /notify:", err);
    res.status(500).send("Eroare la notificare");
  }
});

// --- Butoane Acceptat / Respins ---
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // opțional: verifică dacă are rolul potrivit (modifică dacă vrei alt control)
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(GUILD_ROLE_ID) || member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasRole) {
    return interaction.reply({ content: "⛔ Nu ai permisiunea să validezi/respingi.", ephemeral: true });
  }

  // reconstruim payloadul din textul embedului original
  const orig = interaction.message.embeds?.[0];
  const fields = Object.fromEntries((orig?.fields || []).map(f => [f.name, f.value]));
  const payload = {
    nume: fields["👤 Nume"] || "",
    telefon: fields["📞 Telefon"] || "",
    discord: fields["🪪 Discord"] || "",
    id: fields["🆔 ID"] || ""
  };

  if (interaction.customId === "acceptat") {
    const approved = buildApprovedEmbed(member, payload);
    await interaction.update({ content: "✅ Candidatul a fost **ACCEPTAT**.", embeds: [approved], components: [] });
    return;
  }

  if (interaction.customId === "respins") {
    const rejected = buildRejectedEmbed(member, payload);
    await interaction.update({ content: "❌ Candidatul a fost **RESPINS**.", embeds: [rejected], components: [] });
    return;
  }
});

// --- Start ---
client.login(process.env.TOKEN);
app.listen(5000, () => console.log("Bot online + server web activ pe port 5000!"));

const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const express = require("express");

// === BOT DISCORD ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

// === MIC SERVER WEB (pentru Google Script să trimită notificări) ===
const app = express();
app.use(express.json());

// Endpoint unde Google Script trimite datele
app.post("/notify", async (req, res) => {
  try {
    const { id, nume, telefon, discord, mentiuni } = req.body;
    const channel = await client.channels.fetch("1423055839543169055"); // canalul tău
    
    // butoane Acceptat / Respins
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("acceptat")
        .setLabel("✅ Acceptat")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("respins")
        .setLabel("❌ Respins")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&1423071575875391558> O persoană a aplicat!\n\n**ID:** ${id}\n**Nume:** ${nume}\n**Telefon:** ${telefon || "N/A"}\n**Discord:** ${discord}\n**Mențiuni:** ${mentiuni}`,
      components: [row]
    });

    res.status(200).send("Notificare trimisă pe Discord");
  } catch (err) {
    console.error(err);
    res.status(500).send("Eroare la notificare");
  }
});

// === Reacție la apăsarea butoanelor ===
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "acceptat") {
    await interaction.update({
      content: `✅ Candidatul **${interaction.message.content.match(/\*\*Nume:\*\* (.+)/)[1]}** a fost **ACCEPTAT**.`,
      components: []
    });
  }

  if (interaction.customId === "respins") {
    await interaction.update({
      content: `❌ Candidatul **${interaction.message.content.match(/\*\*Nume:\*\* (.+)/)[1]}** a fost **RESPINS**.`,
      components: []
    });
  }
});

// === Pornire ===
client.login(process.env.TOKEN); // TOKEN se pune în Secrets/Replit env
app.listen(3000, () => console.log("Bot online + server web activ!"));

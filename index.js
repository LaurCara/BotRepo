client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const hasRole = member.roles.cache.has(GUILD_ROLE_ID) ||
                  member.permissions.has(PermissionsBitField.Flags.ManageGuild);
  if (!hasRole) {
    return interaction.reply({ content: "⛔ Nu ai permisiunea să validezi/respingi.", ephemeral: true });
  }

  // reconstruim payloadul din embedul inițial
  const orig = interaction.message.embeds?.[0];
  const fields = Object.fromEntries((orig?.fields || []).map(f => [f.name, f.value]));
  const payload = {
    nume: fields["👤 Nume"] || "",
    telefon: fields["📞 Telefon"] || "",
    discord: fields["🪪 Discord"] || "",
    id: fields["🆔 ID"] || ""
  };

  if (interaction.customId === "acceptat") {
    const approved = buildApprovedEmbed(member.user, payload);
    await interaction.update({
      content: `✅ Candidatul **${payload.nume}** a fost **ACCEPTAT** de <@${member.id}>.`,
      embeds: [approved],
      components: []
    });
    return;
  }

  if (interaction.customId === "respins") {
    const rejected = buildRejectedEmbed(member.user, payload);
    await interaction.update({
      content: `❌ Candidatul **${payload.nume}** a fost **RESPINS** de <@${member.id}>.`,
      embeds: [rejected],
      components: []
    });
    return;
  }
});

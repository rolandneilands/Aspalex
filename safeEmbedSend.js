// utils/safeEmbedSend.js
export async function safeEmbedSend(channel, text, title = 'Response') {
  const chunks = chunkText(text, 4096);
  const embeds = chunks.map((c, i) => ({
    title: i === 0 ? title : undefined,
    description: c,
    color: 0xE67E22, // nice ember orange
  }));

  // If more than 10 chunks, send in waves of 10
  for (let i = 0; i < embeds.length; i += 10) {
    await channel.send({ embeds: embeds.slice(i, i + 10) });
  }
}

function chunkText(t, max = 4096) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    out.push(t.slice(i, i + max));
    i += max;
  }
  return out;
}
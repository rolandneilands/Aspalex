import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Load .env config
config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CUSTOM_GPT_ID = process.env.CUSTOM_GPT_ID;
const TEMPERATURE = process.env.TEMPERATURE;
const MAX_TOKENS = process.env.MAX_TOKENS;

// Load allowed channel IDs into an array
const allowedChannelIds = process.env.DISCORD_CHANNEL_IDS
  .split(',')
  .map(id => id.trim());


// Define known personas
const PERSONAS = ['Aspalex', 'Akaanvaerd', 'Kalavanjert'];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const COMMAND_REGEX = /\{(.+?)\}\s*asks\s+(the ship|Aspalex|Akaanvaerd|Kalavanjert)[:,]?\s*(.+)/i;

client.once('ready', () => {
  console.log(`🚀 The Ship Who Chats is online as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  console.log(`📩 Message in channel ${message.channel.id} from ${message.author.tag}: "${message.content}"`);
  if (message.author.bot) return;
  
  // Check if message is from an allowed channel
  if (!allowedChannelIds.includes(message.channel.id)) return;
  
  if (message.content.startsWith('!ping')) {
    message.channel.send('Pong! 🏓');
    console.log('✅ Responded to !ping');
  }

  const content = message.content.trim();

  // HELP COMMAND
  if (content.toLowerCase() === '!shiphelp') {
    const helpMessage = `
**🛸 The Ship Who Chats – Help Guide**

To ask a question, use this format:
\`\`\`
{CharacterName} asks the ship: [your question]
\`\`\`
You can also direct your question to one of the ship's personas:
\`\`\`
{CharacterName} asks Aspalex: [your question]
{CharacterName} asks Akaanvaerd: [your question]
{CharacterName} asks Kalavanjert: [your question]
\`\`\`

Examples:
- \`{Leon} asks the ship: What do the efreet think of us?\`
- \`{Teririst} asks Akaanvaerd: Who hired the rakshasa?\`

Only characters known to the ship will be answered. Stay in-world. No metagame questions allowed.

To show this again, type \`!shiphelp\`.
    `;
    await message.reply(helpMessage);
    return;
  }

  // QUESTION PARSING
  const match = content.match(COMMAND_REGEX);
  if (!match) return;

  const character = match[1].trim();
  const target = match[2].trim();
  const question = match[3].trim();

  const preferredPersona = PERSONAS.includes(target) ? target : null;
  let prompt = `{${character}} asks the ship: ${question}`;
  if (preferredPersona) {
    prompt += ` (Answer as ${preferredPersona})`;
  }

  try {
    await message.channel.sendTyping();

    const completion = await openai.chat.completions.create({
      model: CUSTOM_GPT_ID,
      messages: [
        { role: 'user', content: prompt },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    });

    const reply = completion.choices[0].message.content.trim();
    await message.reply(reply);

  } catch (err) {
    console.error('❌ GPT or API error:', err);
    await message.reply('⚠️ The ship shudders and falls silent. Something is wrong.');
  }
});

client.on('error', err => console.error('⚠️ Discord error:', err));
client.on('warn', w => console.warn('⚠️ Warning:', w));

client.login(DISCORD_TOKEN).catch(err => {
  console.error('🔑 Login failed:', err);
});

// Fake HTTP server to keep Render's web service happy
import http from 'http';

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Discord bot is running.');
}).listen(process.env.PORT || 3000);
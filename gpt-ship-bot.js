import { Client, GatewayIntentBits } from 'discord.js';
import OpenAI from 'openai';
import fs from 'fs/promises';
import { systemPrompt } from './systemPrompt.js';

// Commenting out - using Render env vars
//import { config } from 'dotenv';
// Load .env config
// dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CUSTOM_GPT_ID = process.env.CUSTOM_GPT_ID;
const TEMPERATURE = process.env.TEMPERATURE;
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS, 10) || 2000;
const GPT_MODEL_ID = process.env.GPT_MODEL_ID;

// Load allowed channel IDs into an array
const allowedChannelIds = process.env.DISCORD_CHANNEL_IDS
  .split(',')
  .map(id => id.trim());

// Define known personas
//const PERSONAS = ['Aspalex', 'Akaanvaerd', 'Kalavanjert'];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

let loreFiles = {};

async function loadLoreFiles() {
  loreFiles.sessionLogs = await fs.readFile('./SessionLogs.md', 'utf8');
  loreFiles.instructions = await fs.readFile('./Instructions.md', 'utf8');
  loreFiles.locations = await fs.readFile('./Locations.md', 'utf8');
  loreFiles.calendar = await fs.readFile('./Calendar.md', 'utf8');
}

//const COMMAND_REGEX = /\{(.+?)\}\s*asks\s+(the ship|Aspalex|Akaanvaerd|Kalavanjert)[:,]?\s*(.+)/i;

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
{CharacterName} asks the ship [your question]
\`\`\`

Example:
- \`{Leon} asks the ship: What do the efreet think of us?\`

Only characters known to the ship will be answered. Stay in-world. No metagame questions allowed.

To show this again, type \`!shiphelp\`.
    `;
    await message.reply(helpMessage);
    return;
  }

  // QUESTION PARSING
  //const match = content.match(COMMAND_REGEX);
  //if (!match) return;
  if (!content.includes('asks the ship')) return;
  

  /*const character = match[1].trim();
  const target = match[2].trim();
  const question = match[3].trim();

  const preferredPersona = PERSONAS.includes(target) ? target : null;
  let prompt = `{${character}} asks the ship: ${question}`;
  if (preferredPersona) {
    prompt += ` (Answer as ${preferredPersona})`;
  } */
  
  const chatHistory = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `CAMPAIGN KNOWLEDGE:\n${loreFiles.instructions}\n\n${loreFiles.sessionLogs}\n\n${loreFiles.locations}\n\n${loreFiles.calendar}` },
    { role: 'user', content: content }
  ];


  try {
    await message.channel.sendTyping();

    const completion = await openai.chat.completions.create({
      /*model: CUSTOM_GPT_ID,
      messages: [
        { role: 'user', content: prompt },
      ],*/
      
      // model: 'gpt-4o',
      model: GPT_MODEL_ID,
      messages: chatHistory,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    });

    const reply = completion.choices[0].message.content.trim();
    await message.reply(reply);

  } catch (err) {
    console.error('❌ GPT or API error:', err);
    await message.reply('⚠️ The ship shudders, complains about bugs its logs and falls silent. Something is wrong.');
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
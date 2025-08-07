// rag.js
import fs from 'fs';
import path from 'path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const EMBED_THRESHOLD = 10 * 1024; // 10KB
const CONTEXT_CHUNKS = parseInt(process.env.EMBEDDING_CONTEXT_CHUNKS || '5', 10);
const LORE_DIR = './lore';

let inlineLore = '';
let embeddedChunks = [];

export async function loadLore() {
  inlineLore = '';
  embeddedChunks = [];

  const files = fs.readdirSync(LORE_DIR).filter(file => file.endsWith('.md'));

  for (const file of files) {
    const fullPath = path.join(LORE_DIR, file);
    const stat = fs.statSync(fullPath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    if (stat.size <= EMBED_THRESHOLD) {
      inlineLore += `\n\n### ${file}\n${content}`;
    } else {
      const chunks = splitIntoChunks(content, 500); // tweak chunk size here
      for (const chunk of chunks) {
        const embedding = await embedText(chunk);
        embeddedChunks.push({ chunk, embedding, source: file });
      }
    }
  }

  console.log(`Loaded ${files.length} lore files: ${embeddedChunks.length} embedded chunks.`);
}

// Simple text splitter
function splitIntoChunks(text, maxWords) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

// Embed a chunk of text
async function embedText(text) {
  const res = await openai.embeddings.create({
    input: text,
    model: EMBEDDING_MODEL,
  });
  return res.data[0].embedding;
}

// Find top N similar chunks for a query
export async function getSimilarLore(query, debug = false) {
  if (!embeddedChunks.length) return [];

  const queryEmbedding = await embedText(query);
  const scored = embeddedChunks.map(({ chunk, embedding, source }) => ({
    chunk,
    source,
    score: cosineSimilarity(queryEmbedding, embedding),
  }));

  const topChunks = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, CONTEXT_CHUNKS);

  if (debug) {
    return topChunks.map(c => `\n---\n**[${c.source}]**\n${c.chunk}\n(Similarity: ${c.score.toFixed(3)})`);
  } else {
    return topChunks.map(c => c.chunk);
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB);
}

export function getInlineLore() {
  return inlineLore.trim();
}
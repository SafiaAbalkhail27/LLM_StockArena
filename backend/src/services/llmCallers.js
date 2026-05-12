import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

let openaiClient, anthropicClient, geminiClient;

function getOpenAI() {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function getAnthropic() {
  if (!anthropicClient) anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropicClient;
}

function getGemini() {
  if (!geminiClient) geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  return geminiClient;
}

export async function callGPT4o(prompt) {
  const client = getOpenAI();
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
  });
  return res.choices[0].message.content;
}

export async function callClaude(prompt) {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  return res.content[0].text;
}

export async function callGemini(prompt) {
  const client = getGemini();
  const model = client.getGenerativeModel({ model: 'gemini-1.5-pro' });
  const res = await model.generateContent(prompt);
  return res.response.text();
}

export async function callGrok(prompt) {
  const client = new OpenAI({
    apiKey: process.env.XAI_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });
  const res = await client.chat.completions.create({
    model: 'grok-2-latest',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
  });
  return res.choices[0].message.content;
}

export const LLM_CALLERS = {
  gpt4o: callGPT4o,
  claude: callClaude,
  gemini: callGemini,
  grok: callGrok,
};

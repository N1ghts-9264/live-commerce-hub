import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const o = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

async function test() {
  console.log('Testing DeepSeek API...');
  const r = await o.chat.completions.create({
    model: 'deepseek-chat',
    messages: [{
      role: 'user',
      content: '你是直播电商选品专家。请为"女装"品类生成5个可用于直播带货的商品名称。返回JSON数组。',
    }],
    max_tokens: 500,
    temperature: 0.85,
  });
  console.log(r.choices[0].message.content);
}

test().catch(e => console.error('Error:', e.message));

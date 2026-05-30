import OpenAI from 'openai';
import dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config();

const o = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});

async function test() {
  // Test the exact prompt format used for product names
  for (const cat of ['箱包', '食品饮料', '女装']) {
    console.log(`\n=== Testing: ${cat} ===`);
    const prompt = `你是直播电商选品专家。为"${cat}"品类生成25个直播带货商品名称。价格¥79~899，关键词:真皮、轻便、通勤、百搭。要求：具体有吸引力，如"法式复古碎花连衣裙""持妆控油粉底液SPF50"。返回JSON数组`;

    try {
      const r = await o.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.85,
        max_tokens: 2000,
      });
      const raw = r.choices[0].message.content || '';
      console.log('RAW:', raw.substring(0, 500));

      // Try parsing
      let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      console.log('CLEANED start:', cleaned.substring(0, 200));

      const arrStart = cleaned.indexOf('[');
      const objStart = cleaned.indexOf('{');
      console.log('arrStart:', arrStart, 'objStart:', objStart);

      const start = Math.min(
        arrStart === -1 ? Infinity : arrStart,
        objStart === -1 ? Infinity : objStart
      );

      if (start !== Infinity) {
        cleaned = cleaned.substring(start);
        try {
          const parsed = JSON.parse(cleaned);
          console.log('PARSED type:', Array.isArray(parsed) ? 'array' : typeof parsed);
          if (Array.isArray(parsed)) {
            console.log('Length:', parsed.length);
            console.log('First 3:', parsed.slice(0, 3));
            // Validation test
            const valid = parsed.filter((item: any) => {
              if (typeof item === 'string') {
                const ok = item.length >= 2 && item.length <= 100;
                if (!ok) console.log('  REJECTED string:', JSON.stringify(item));
                return ok;
              }
              console.log('  NON-STRING item:', typeof item, JSON.stringify(item).substring(0, 100));
              return false;
            });
            console.log('Valid:', valid.length);
          }
        } catch (parseErr: any) {
          console.error('PARSE ERROR:', parseErr.message);
          console.error('At position:', cleaned.substring(0, 100));
        }
      }
    } catch (e: any) {
      console.error('API ERROR:', e.message);
    }
  }
}

test().then(() => process.exit(0));

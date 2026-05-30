import { config } from '../config';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: config.llm.apiKey || 'sk-placeholder',
  baseURL: config.llm.baseURL,
});

const LLM_AVAILABLE = !!config.llm.apiKey && config.llm.apiKey !== 'your_deepseek_api_key_here';

// ============================================================
// 1. Script Generation
// ============================================================
export async function generateScript(
  product: any,
  scriptType: string,
  style: string
): Promise<string> {
  if (!LLM_AVAILABLE) {
    return generateFallbackScript(product, scriptType);
  }

  const isFullScript = scriptType === '全部';
  const typeDesc = isFullScript
    ? '完整直播脚本（包含开场暖场→产品详细讲解→信任建立与价值塑造→限时促单逼单→用户答疑→收尾致谢全流程）'
    : `${scriptType}逐字稿`;

  try {
    const prompt = `你是顶级直播带货主播的文案助理。请为以下商品撰写一份${typeDesc}。

商品信息:
- 名称: ${product.product_name}
- 品类: ${product.category}
- 售价: ¥${product.sale_price} (成本¥${product.cost_price})
- 毛利率: ${product.gross_profit_rate}%
${product.description ? `- 商品描述: ${product.description}` : ''}
${product.selling_points ? `- 核心卖点: ${product.selling_points}` : ''}

风格: ${style === '激情' ? '激情澎湃、快节奏、强促单' : style === '亲和' ? '亲切温和、拉家常、建立信任' : '专业详细、理性分析、数据说话'}

要求:
1. 语言口语化、有感染力，符合直播带货场景
2. ${isFullScript ? '覆盖完整直播流程：开场暖场→痛点引入→产品展示→卖点强调→价格锚定→限时促单→答疑→收尾致谢' : '包含: 痛点引入 → 产品展示 → 卖点强调 → 价格锚定 → 限时促单'}
3. 总时长控制在${isFullScript ? '3~4分钟' : '90秒'}可读完
4. 每句话都要有节奏感，适合主播念出来
${isFullScript ? '5. 各段落用小标题标注：【开场】、【讲解】、【促单】、【答疑】、【结尾】' : ''}

只返回脚本内容，不要加任何解释。`;

    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 1000,
    }, { timeout: 15000 } as any);

    return response.choices[0]?.message?.content || generateFallbackScript(product, scriptType);
  } catch (err) {
    console.error('[LLM] Script generation failed, using fallback:', err);
    return generateFallbackScript(product, scriptType);
  }
}

function generateFallbackScript(product: any, scriptType: string): string {
  const templates: Record<string, string> = {
    '全部': `【开场】
哈喽大家好！欢迎来到我们的直播间！我是你们的老朋友，今天给大家带来一款超棒的好物——${product.product_name}！
${product.category}品类一直是我们的王牌，今天这款更是优中选优。家人们，点一波关注，左上角点关注不迷路！

【讲解】
来，家人们看这里！这就是我手上这款${product.product_name}。
首先看它的材质和做工，真的是一分价钱一分货。我们拿在手上的质感，隔着屏幕都能感受到。
${product.selling_points || '每一个细节都经得起考验，无论是日常使用还是特殊场合，都能完美胜任。'}
我给大家算笔账，在专柜同等品质至少要¥${Math.round(parseFloat(product.sale_price) * 1.8)}以上。

【促单】
家人们！重点来了！今天的价格真的史无前例！
${product.product_name}，专柜同款，我们今天直接¥${product.sale_price}！
库存不多，只有最后几十单了！小黄车已上，3、2、1，上链接！

【答疑】
我看到很多家人在问问题。关于质量：每件发出前都有专人检查。关于售后：支持七天无理由退换货，有任何问题随时联系客服。家人们放心下单！

【结尾】
好了家人们，今天的${product.product_name}就介绍到这里。别忘了点关注加入粉丝团！明天同一时间我们再见，爱你们，拜拜！`,

    '开场': `哈喽大家好！欢迎来到我们的直播间！我是你们的老朋友，今天给大家带来一款超棒的好物——${product.product_name}！

${product.category}品类一直是我们的王牌，今天这款更是优中选优。家人们，如果你对${product.category}有需求，今天的直播一定要看到最后！

来，我们先点一波关注，左上角点关注不迷路！今天直播间还有专属福利等着大家！`,

    '讲解': `来，家人们看这里！这就是我手上这款${product.product_name}。

首先看它的材质和做工，真的是一分价钱一分货。我们拿在手上的质感，你们隔着屏幕应该能感受到，真的非常棒。

其次，它的设计也是经过反复打磨的。${product.selling_points || '每一个细节都经得起考验，无论是日常使用还是特殊场合，都能完美胜任。'}

我给大家算笔账，在专柜或者旗舰店，同等品质的产品至少要在¥${Math.round(parseFloat(product.sale_price) * 1.8)}以上。而我们今天直播间，直接给到大家底价！`,

    '促单': `家人们！重点来了！今天的价格真的史无前例！

${product.product_name}，专柜同款，我们今天直接¥${product.sale_price}！

库存不多，只有最后几十单了！我再说一遍，这个价格只限今天直播间！

小黄车已经上了，想要的家人赶紧去拍！3、2、1，上链接！

拍到的家人扣"已拍"，我来给你们备注优先发货！错过今天，明天就不是这个价了！`,

    '答疑': `我看到很多家人在问问题，我统一回复一下。

关于质量的疑问：${product.product_name}我们经过了严格的质检筛选，每一件发出之前都有专人检查，品质有保障。

关于售后：我们支持七天无理由退换货，有任何问题随时联系我们客服，第一时间给你解决。

关于尺码/规格：大家看一下详情页的尺码表，如果还不确定的可以在弹幕问我，我看到就会回复。

所以家人们放心下单，没有任何后顾之忧！`,

    '结尾': `好了家人们，今天的${product.product_name}就给大家介绍到这里。

感谢每一位守在直播间的家人们，你们都是我最大的动力！

别忘了点关注，加入粉丝团，这样下次开播你第一时间就能收到通知。

明天同一时间我们再见，还有更多好物等着大家！爱你们，拜拜！`,
  };

  return templates[scriptType] || templates['讲解'];
}

// ============================================================
// 2. Chat Batch Analysis
// ============================================================
export async function analyzeChatBatch(messages: { id: string; content: string }[]): Promise<any[]> {
  if (!LLM_AVAILABLE || messages.length === 0) {
    return messages.map(m => localSentimentAnalysis(m));
  }

  try {
    const chatList = messages.map(m => `[{id: "${m.id}", content: "${m.content.replace(/"/g, '\\"')}"}]`).join('\n');

    const prompt = `你是一个直播电商数据分析助手。请分析以下直播弹幕列表，对每条弹幕进行分类标注。

分析维度：
1. sentiment: 正面/中性/负面（用户的情绪倾向）
2. semantic_label: 咨询/购买意向/价格质疑/互动参与/售后抱怨/其他
3. purchase_intention: 高/中/低（用户下单的可能性）
4. confidence: 0-1（你对这条分析的置信度）

弹幕列表：
${chatList}

请以JSON格式返回，严格遵循：
[{"id": "<弹幕编号>", "sentiment": "...", "semantic_label": "...", "purchase_intention": "...", "confidence": 0.xx}, ...]`;

    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }, { timeout: 15000 } as any);

    const text = response.choices[0]?.message?.content || '';
    // Extract JSON array
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Invalid LLM response format');
  } catch (err) {
    console.error('[LLM] Chat analysis failed, using local fallback:', err);
    return messages.map(m => localSentimentAnalysis(m));
  }
}

function localSentimentAnalysis(msg: { id: string; content: string }) {
  const content = msg.content;
  const positiveWords = ['好', '棒', '喜欢', '买', '拍', '666', '不错', '赞', '爱', '太', '终于', '值得', '推荐'];
  const negativeWords = ['差', '烂', '贵', '骗', '假', '不行', '退', '不好', '垃圾', '坑', '不如', '别买'];
  const questionWords = ['吗', '怎么', '什么', '多少', '能', '可以', '有', '会', '哪', '谁'];

  let sentiment = '中性';
  const posCount = positiveWords.filter(w => content.includes(w)).length;
  const negCount = negativeWords.filter(w => content.includes(w)).length;
  if (posCount > negCount) sentiment = '正面';
  else if (negCount > posCount) sentiment = '负面';

  let semantic = '其他';
  if (content.includes('买') || content.includes('拍') || content.includes('下单')) semantic = '购买意向';
  else if (questionWords.some(w => content.includes(w))) semantic = '咨询';
  else if (content.includes('贵') || content.includes('便宜') || content.includes('价格')) semantic = '价格质疑';
  else if (content.includes('666') || content.includes('来了') || content.includes('关注')) semantic = '互动参与';
  else if (content.includes('退') || content.includes('差') || content.includes('投诉')) semantic = '售后抱怨';

  let purchaseIntention = '低';
  if (content.includes('已拍') || content.includes('买了') || content.includes('下单')) purchaseIntention = '高';
  else if (content.includes('想买') || content.includes('犹豫') || content.includes('纠结')) purchaseIntention = '中';

  return {
    id: msg.id,
    sentiment,
    semantic_label: semantic,
    purchase_intention: purchaseIntention,
    confidence: 0.7,
  };
}

// ============================================================
// 3. Insight Generation
// ============================================================
export async function generateInsight(chatSummary: string, sentimentStats: any): Promise<any> {
  if (!LLM_AVAILABLE) {
    return {
      focusPoints: ['用户对产品品质关注度高', '价格是主要讨论话题'],
      moodTrend: sentimentStats.positive > sentimentStats.negative ? '积极向好' : '有待观察',
      riskAlerts: sentimentStats.negative > 30 ? ['负面情绪较高，建议关注'] : [],
    };
  }

  try {
    const prompt = `直播正在进行中，以下是近5分钟的弹幕情绪统计和关键片段，请做简要分析。

情绪分布: 正面${sentimentStats.positive}% 中性${sentimentStats.neutral}% 负面${sentimentStats.negative}%
弹幕摘要: ${chatSummary}

请用JSON格式输出:
{"focusPoints": ["关注点1", "关注点2"], "moodTrend": "趋势描述一句话", "riskAlerts": ["风险提示"]}`;

    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400,
    }, { timeout: 15000 } as any);

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('[LLM] Insight generation failed:', err);
    return { focusPoints: [], moodTrend: '数据不足', riskAlerts: [] };
  }
}

// ============================================================
// 4. Real-time Script Recommendation
// ============================================================
export async function recommendScript(
  signal: string,
  productName: string,
  price: number,
  recentChats: string,
  sentimentStats: any
): Promise<string | null> {
  if (!LLM_AVAILABLE) {
    return getFallbackRecommendation(signal, productName, price);
  }

  try {
    const prompt = `直播正在进行中，需要立即给主播一个短话术建议。
当前商品: ${productName} | 售价: ¥${price}
触发信号: ${signal}
最近弹幕: ${recentChats}
直播氛围: 正面${sentimentStats.positive}% 中性${sentimentStats.neutral}% 负面${sentimentStats.negative}%

请生成3句以内的话术建议，要求:
1. 口语化、可直接念出口
2. 精准回应触发信号
3. 不超过50字

只返回话术文本，不要解释。`;

    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 200,
    }, { timeout: 10000 } as any);

    return response.choices[0]?.message?.content || getFallbackRecommendation(signal, productName, price);
  } catch (err) {
    console.error('[LLM] Script recommendation failed:', err);
    return getFallbackRecommendation(signal, productName, price);
  }
}

function getFallbackRecommendation(signal: string, productName: string, price: number): string {
  const map: Record<string, string> = {
    '价格质疑': `家人们，${productName}这个价格真的是工厂直供价！我们跟品牌方谈了三个月才拿到的专属福利，错过今天就没有了！`,
    '购买意向': `看到很多家人想拍了！小黄车已经上了，¥${price}，库存不多，先拍先得！拍了扣"已拍"我给你们优先发货！`,
    '产品咨询': `关于大家问的问题，我统一回复：品质有保障，支持七天无理由，相信我的家人可以直接拍！`,
    '负面情绪': `家人们放心，我们做直播是认真的。有任何问题随时找客服，我们承诺24小时内给你满意答复！`,
    '冷场': `家人们别潜水了！弹幕扣起来！接下来我要抽一波福利，在线的家人都能参与！`,
    '商品切换': `好，接下来给大家看一款新品——${productName}！这款真的绝了，错过会后悔的！`,
  };
  return map[signal] || `家人们，${productName}真的很好，赶紧下单吧！`;
}

// ============================================================
// 5. New Product Cold Start Assessment
// ============================================================
export async function assessNewProduct(product: any, categoryTrend: string): Promise<any> {
  if (!LLM_AVAILABLE) {
    return {
      potential_level: '中',
      estimated_conversion: '2%-5%',
      target_audience: `${product.category}爱好者`,
      selling_angle: `突出性价比和品质`,
      risk_notes: '新商品数据不足，需观察首场直播表现',
    };
  }

  try {
    const prompt = `你是直播电商选品专家。以下是新商品信息，请评估其直播带货潜力。

商品: ${product.product_name}
品类: ${product.category}
品牌: ${product.brand || '未知'}
成本: ¥${product.cost_price} | 售价: ¥${product.sale_price} | 毛利率: ${product.gross_profit_rate}%
${product.description ? `描述: ${product.description}` : ''}
${product.selling_points ? `卖点: ${product.selling_points}` : ''}

该品类近30天趋势: ${categoryTrend}

请以JSON格式输出评估:
{"potential_level": "高/中/低", "estimated_conversion": "预估转化率区间", "target_audience": "目标人群描述", "selling_angle": "推荐讲解角度", "risk_notes": "风险提示"}`;

    const response = await client.chat.completions.create({
      model: config.llm.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500,
    }, { timeout: 15000 } as any);

    const text = response.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Invalid response');
  } catch (err) {
    console.error('[LLM] Product assessment failed:', err);
    return { potential_level: '中', estimated_conversion: '2%-5%', target_audience: `${product.category}爱好者`, selling_angle: '突出性价比', risk_notes: '待验证' };
  }
}

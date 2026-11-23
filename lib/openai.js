// OpenAI 클라이언트 및 도우미 모듈
import OpenAI from 'openai';

let client = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 8000,
      maxRetries: 0
    });
  }
  return client;
}

export async function moderateText(text) {
  const openai = getOpenAI();
  if (!openai) return null;
  try {
    const r = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text
    });
    return { flagged: Boolean(r.results?.[0]?.flagged) };
  } catch {
    return null;
  }
}

export async function rephraseHint(game, fact) {
  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL;
  if (!openai || !model) return null;

  try {
    const prompt = `너는 퍼즐 게임 「퍼즐랜드」의 도우미 캐릭터다. 사용자가 막혀서 힌트를 요청했다.
아래 힌트 사실(fact)을 바탕으로, 플레이어에게 도움이 되는 자연스러운 한국어 해요체 1문장(최대 60자)으로 친절하게 다듬어라.
정답을 통째로 알려주지 말고, 반짝이는 대상에 주목하게 해라.
[게임] ${game === 'FN' ? '울타리 퍼즐' : '마방진 퍼즐'}
[힌트 사실] ${fact.fallbackText}`;

    const res = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });

    const content = res.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}

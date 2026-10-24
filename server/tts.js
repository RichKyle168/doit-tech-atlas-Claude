/**
 * Natural read-aloud voice.
 *
 * With AZURE_SPEECH_KEY and AZURE_SPEECH_REGION set, star pages are read by Azure's neural
 * zh-TW-YunJheNeural (a warm Taiwanese male voice) at its normal speed; the visitor's speed
 * setting is applied in the browser.
 * Each text is synthesised once and kept in the database (tts_cache), so a page costs
 * characters only the first time anybody listens to it.
 * Without a key the browser reads with the device's own voice instead.
 *
 *   TTS_VOICE  default zh-TW-YunJheNeural
 *   TTS_RATE   default 0%
 *   TTS_PITCH  default 0%
 */
import { createHash } from 'node:crypto';

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

export function createTts({
  key = process.env.AZURE_SPEECH_KEY,
  region = process.env.AZURE_SPEECH_REGION,
  voice = process.env.TTS_VOICE || 'zh-TW-YunJheNeural',
  rate = process.env.TTS_RATE || '0%',
  pitch = process.env.TTS_PITCH || '0%',
  synthesize = null, // inject for tests
  fetchImpl = globalThis.fetch,
} = {}) {
  const provider = synthesize ? 'custom' : key && region ? 'azure' : null;

  async function azure(text) {
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-TW">`
      + `<voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}">${escapeXml(text)}</prosody></voice></speak>`;
    const res = await fetchImpl(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'doit-tech-atlas',
      },
      body: ssml,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`Azure TTS answered ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  return {
    available: Boolean(provider),
    provider,
    voice,
    cacheKey: (text) => createHash('sha256').update([provider, voice, rate, pitch, text].join('|')).digest('hex'),
    synthesize: synthesize || azure,
  };
}

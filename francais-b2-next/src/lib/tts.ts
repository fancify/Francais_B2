/**
 * Web Speech API — 替代 Python 的 edge-tts，浏览器内置免费。
 */

/** 朗读法语文本。优先选择法语声音，语速 0.9。 */
export function speakFrench(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.9;

  // 优先选择法语声音
  const voices = window.speechSynthesis.getVoices();
  const frVoice = voices.find((v) => v.lang.startsWith("fr"));
  if (frVoice) utterance.voice = frVoice;

  window.speechSynthesis.speak(utterance);
}

/** 停止所有语音朗读。 */
export function stopSpeaking(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

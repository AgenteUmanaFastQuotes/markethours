let audioCtx = null;
let masterGain = null;
let compressor = null;

function ensureAudioChain() {
  if (!audioCtx) return false;
  if (masterGain && compressor) return true;

  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
  compressor.knee.setValueAtTime(12, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(4, audioCtx.currentTime);
  compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
  compressor.release.setValueAtTime(0.15, audioCtx.currentTime);
  compressor.connect(audioCtx.destination);

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
  masterGain.connect(compressor);

  return true;
}

async function ensureAudioReady() {
  const AudioContextClass = self.AudioContext || self.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("Web Audio API is not available in this Chrome context.");
  }

  if (!audioCtx || audioCtx.state === "closed") {
    audioCtx = new AudioContextClass();
    masterGain = null;
    compressor = null;
  }

  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }

  if (audioCtx.state !== "running") {
    throw new Error(`AudioContext is ${audioCtx.state}, not running.`);
  }

  ensureAudioChain();
  return true;
}

function playTone(freq, startOffset, duration, type, gainValue) {
  if (!audioCtx || audioCtx.state !== "running" || !masterGain) return false;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const startAt = audioCtx.currentTime + startOffset;

  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, startAt);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue || 0.18, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start(startAt);
  osc.stop(startAt + duration + 0.04);

  return true;
}

async function playOpeningGong() {
  await ensureAudioReady();

  let ok = true;
  ok = playTone(196, 0.00, 1.20, "sine", 0.60) && ok;
  ok = playTone(392, 0.01, 0.80, "sine", 0.50) && ok;
  ok = playTone(588, 0.02, 0.50, "sine", 0.35) && ok;
  ok = playTone(784, 0.03, 0.35, "sine", 0.20) && ok;
  ok = playTone(294, 0.00, 1.00, "triangle", 0.15) && ok;

  if (!ok) {
    throw new Error("One or more gong tones could not be scheduled.");
  }

  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== "offscreen" || message.type !== "PLAY_OPENING_GONG") {
    return false;
  }

  playOpeningGong()
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// TTS Service — browser Web Speech API wrapper
// ---------------------------------------------------------------------------

const DEFAULTS = {
  rate: 0.9,
  pitch: 0.8,
  volume: 1.0,
};

let config = { ...DEFAULTS };
let speaking = false;
let listeners = new Set();

function notify() {
  for (const fn of listeners) fn(speaking);
}

/** Pick a deep/gruff English voice when available. */
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  // Prefer deep-sounding male English voices
  const deepKeywords = ['male', 'daniel', 'james', 'thomas', 'fred', 'alex'];
  const english = voices.filter(v => /^en[-_]/i.test(v.lang));

  for (const kw of deepKeywords) {
    const match = english.find(v => v.name.toLowerCase().includes(kw));
    if (match) return match;
  }
  // Fall back to any English voice, then default
  return english[0] || voices[0] || null;
}

/** Speak text. Returns a Promise that resolves when utterance ends. */
function speak(text) {
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis) {
      reject(new Error('Web Speech API not supported'));
      return;
    }
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;

    utterance.onstart = () => {
      speaking = true;
      notify();
    };
    utterance.onend = () => {
      speaking = false;
      notify();
      resolve();
    };
    utterance.onerror = (e) => {
      speaking = false;
      notify();
      // 'canceled' / 'interrupted' are expected from stop()
      if (e.error === 'canceled' || e.error === 'interrupted') {
        resolve();
      } else {
        reject(e);
      }
    };

    speechSynthesis.speak(utterance);
  });
}

/** Stop any in-progress speech. */
function stop() {
  if (window.speechSynthesis) {
    speechSynthesis.cancel();
  }
  if (speaking) {
    speaking = false;
    notify();
  }
}

/** Update rate, pitch, and/or volume. */
function configure(opts) {
  if (opts.rate != null) config.rate = opts.rate;
  if (opts.pitch != null) config.pitch = opts.pitch;
  if (opts.volume != null) config.volume = opts.volume;
}

/** Subscribe to speaking-state changes. Returns unsubscribe function. */
function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reactive getter — reads current speaking state. */
function getIsSpeaking() {
  return speaking;
}

export const ttsService = {
  speak,
  stop,
  configure,
  subscribe,
  get isSpeaking() { return getIsSpeaking(); },
};

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(getIsSpeaking);

  useEffect(() => {
    // Sync immediately in case state changed before mount
    setIsSpeaking(getIsSpeaking());
    return subscribe(setIsSpeaking);
  }, []);

  return {
    speak,
    stop,
    configure,
    isSpeaking,
  };
}

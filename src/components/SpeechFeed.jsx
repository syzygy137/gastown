import React, { useRef, useEffect, useState } from 'react';
import './SpeechFeed.css';

const MAX_VISIBLE = 6;

function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function SpeechFeed({ messages = [], currentMessage = null }) {
  const feedRef = useRef(null);
  const [typing, setTyping] = useState(false);
  const prevCountRef = useRef(messages.length);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Show typing animation briefly when a new currentMessage appears
  useEffect(() => {
    if (currentMessage && messages.length > prevCountRef.current) {
      setTyping(true);
      const timer = setTimeout(() => setTyping(false), 600);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = messages.length;
  }, [currentMessage, messages.length]);

  // Only show the last MAX_VISIBLE messages
  const visible = messages.slice(-MAX_VISIBLE);
  const fadeStart = Math.max(0, visible.length - 1);

  if (!messages.length && !typing) {
    return (
      <div className="speech-feed">
        <div className="speech-feed__empty">Waiting for mayor...</div>
      </div>
    );
  }

  return (
    <div className="speech-feed" ref={feedRef}>
      {visible.map((msg, i) => {
        const isCurrent = currentMessage != null && msg.id === currentMessage;
        const distFromEnd = visible.length - 1 - i;
        const fadeClass = isCurrent || distFromEnd === 0
          ? ''
          : distFromEnd <= 4
            ? `speech-bubble--faded-${distFromEnd}`
            : 'speech-bubble--faded-4';

        return (
          <div
            key={msg.id}
            className={`speech-bubble ${isCurrent ? 'speech-bubble--current' : ''} ${fadeClass}`}
          >
            {msg.text}
            <span className="speech-bubble__time">{formatTime(msg.timestamp)}</span>
          </div>
        );
      })}
      {typing && (
        <div className="speech-bubble speech-bubble--typing">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      )}
    </div>
  );
}

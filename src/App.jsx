import React, { useEffect, useRef } from 'react';
import MayorAvatar from './components/MayorAvatar.jsx';
import SpeechFeed from './components/SpeechFeed.jsx';
import StatusHUD from './components/StatusHUD.jsx';
import useMayorFeed from './hooks/useMayorFeed.js';
import useTTS from './hooks/useTTS.js';
import './components/MayorAvatar.css';
import './components/SpeechFeed.css';
import './components/StatusHUD.css';

export default function App() {
  const feed = useMayorFeed();
  const { speaking, speak } = useTTS();
  const lastMsgRef = useRef(0);

  // When a new message arrives, speak it and mark as current
  useEffect(() => {
    if (feed.messages.length > lastMsgRef.current) {
      const latest = feed.messages[feed.messages.length - 1];
      if (latest?.text) {
        speak(latest.text);
      }
      lastMsgRef.current = feed.messages.length;
    }
  }, [feed.messages, speak]);

  const currentMessageId =
    feed.messages.length > 0 ? feed.messages[feed.messages.length - 1].id : null;

  return (
    <div className="mayor-dashboard">
      <StatusHUD
        connected={feed.connected}
        agents={feed.agents}
        issues={feed.issues}
        polecats={feed.polecats}
        messages={feed.messages}
      />

      <div className="mayor-dashboard__center">
        <div className="mayor-dashboard__feed">
          <SpeechFeed messages={feed.messages} currentMessage={currentMessageId} />
        </div>

        <MayorAvatar speaking={speaking} />
      </div>
    </div>
  );
}

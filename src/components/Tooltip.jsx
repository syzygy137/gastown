import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function Tooltip({ content, children, delay = 300, maxWidth = 300 }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'above' });
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);
  const tipRef = useRef(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (!wrapperRef.current) return;
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible || !wrapperRef.current || !tipRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const placement = spaceAbove > tip.height + 12 ? 'above' : 'below';
    let top = placement === 'above'
      ? rect.top - tip.height - 8
      : rect.bottom + 8;
    let left = rect.left + rect.width / 2 - tip.width / 2;
    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tip.width - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tip.height - 8));
    setPos({ top, left, placement });
  }, [visible]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!content) return children;

  return (
    <span
      className="tooltip-wrapper"
      ref={wrapperRef}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className={`tooltip-box tooltip-box--${pos.placement}`}
          ref={tipRef}
          style={{ top: pos.top, left: pos.left, maxWidth }}
        >
          {typeof content === 'string' ? <span>{content}</span> : content}
          <div className="tooltip-arrow" />
        </div>
      )}
    </span>
  );
}

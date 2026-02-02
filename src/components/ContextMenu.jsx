import React, { useEffect, useRef, useCallback, useState } from 'react';

export default function ContextMenu({ items, position, onClose }) {
  const menuRef = useRef(null);
  const [adjusted, setAdjusted] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let { x, y } = position;
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
    if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    setAdjusted({ x, y });
  }, [position]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    // Use timeout so the contextmenu event itself doesn't immediately close
    const id = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => { clearTimeout(id); window.removeEventListener('mousedown', onClick); };
  }, [onClose]);

  const handleAction = useCallback((item, e) => {
    e.stopPropagation();
    if (item.disabled) return;
    onClose();
    item.action();
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ left: adjusted.x, top: adjusted.y }}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="ctx-menu__sep" />
        ) : (
          <button
            key={i}
            className={`ctx-menu__item${item.disabled ? ' ctx-menu__item--disabled' : ''}`}
            onClick={e => handleAction(item, e)}
            disabled={item.disabled}
          >
            {item.icon && <span className="ctx-menu__icon">{item.icon}</span>}
            <span className="ctx-menu__label">{item.label}</span>
            {item.hint && <span className="ctx-menu__hint">{item.hint}</span>}
          </button>
        )
      )}
    </div>
  );
}

/**
 * Hook for managing context menu state.
 * Returns [menuState, showMenu, hideMenu] where menuState is {visible, position, data}.
 */
export function useContextMenu() {
  const [menu, setMenu] = useState({ visible: false, position: { x: 0, y: 0 }, data: null });

  const show = useCallback((e, data) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ visible: true, position: { x: e.clientX, y: e.clientY }, data });
  }, []);

  const hide = useCallback(() => {
    setMenu(m => ({ ...m, visible: false }));
  }, []);

  return [menu, show, hide];
}

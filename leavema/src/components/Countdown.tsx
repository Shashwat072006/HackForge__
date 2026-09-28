// src/components/Countdown.tsx
import React, { useState, useEffect } from 'react';
import { countdown, isUrgent } from '../lib/format';

export default function Countdown({ deadline }: { deadline?: string | null }) {
  const [text, setText] = useState(() => countdown(deadline));
  const urgent = isUrgent(deadline);

  useEffect(() => {
    if (!deadline) return;
    const iv = setInterval(() => setText(countdown(deadline)), 30_000);
    return () => clearInterval(iv);
  }, [deadline]);

  if (!deadline || !text) return null;

  return (
    <span className={`countdown${urgent ? ' urgent' : ''}`}>
      ⏱ {text}
    </span>
  );
}

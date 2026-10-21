import { useEffect, useRef, useState } from 'react';

// A message that clears itself after `ms`. Showing a new message restarts
// the timer, so an older message's timer can't clear a newer one early.
export function useNotice(ms = 4000) {
  const [notice, setNotice] = useState('');
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  function show(message, duration = ms) {
    clearTimeout(timer.current);
    setNotice(message);
    timer.current = setTimeout(() => setNotice(''), duration);
  }
  return [notice, show];
}

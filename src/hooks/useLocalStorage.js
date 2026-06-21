import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const set = (val) => {
    try {
      const toStore = val instanceof Function ? val(value) : val;
      setValue(toStore);
      localStorage.setItem(key, JSON.stringify(toStore));
    } catch (e) { console.error(e); }
  };

  const remove = () => {
    localStorage.removeItem(key);
    setValue(initialValue);
  };

  return [value, set, remove];
}

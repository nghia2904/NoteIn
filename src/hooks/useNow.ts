import { useEffect, useState } from 'react';

export function useNow(): Date {
  const override = process.env.EXPO_PUBLIC_TEST_NOW;
  const initial = override ? new Date(override) : new Date();
  const [now, setNow] = useState<Date>(initial);

  useEffect(() => {
    if (override) {
      setNow(initial);
      return;
    }

    const timer = setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [initial, override]);

  return now;
}

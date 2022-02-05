import { releaseProxy, wrap } from 'comlink';
import { RefCallback, useCallback, useEffect, useMemo, useState } from 'react';
/* eslint-disable import/no-unresolved */
// @ts-ignore

export function updateObj<T>(oldObj: T, newObj: Partial<T>) {
  Object.entries(newObj).forEach(([key, value]) => {
    if (value === undefined) return;
    oldObj[key as keyof T] = value as T[keyof T];
  });

  return oldObj;
}

export function useRefCallback<T>(initialValue: T, callback: (newValue: T) => void): [T, RefCallback<T>] {
  const [value, setValue] = useState(initialValue);
  const setRef = useCallback((newValue) => {
    setValue(newValue);
    callback(newValue);
  }, []);

  return [value, setRef];
}

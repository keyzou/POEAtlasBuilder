import { MutableRefObject, RefCallback, useCallback, useRef, useState } from 'react';

export function updateObj<T>(oldObj: T, newObj: Partial<T>) {
  Object.entries(newObj).forEach(([key, value]) => {
    if (value === undefined) return;
    oldObj[key as keyof T] = value as T[keyof T];
  });

  return oldObj;
}

export function useStateCallback<T>(initialValue: T, callback: (newValue: T) => void): [T, RefCallback<T>] {
  const [value, setValue] = useState(initialValue);
  const setRef = useCallback((newValue) => {
    setValue(newValue);
    callback(newValue);
  }, []);

  return [value, setRef];
}

export function useForceUpdate() {
  const [, setValue] = useState(0); // integer state
  return () => setValue((value) => value + 1); // update the state to force render
}

export function useRefCallback<T>(
  initialValue: T,
  callback: (newValue: T) => void
): [MutableRefObject<T>, RefCallback<T>] {
  const value = useRef<T>(initialValue);
  const setRef = useCallback((newValue) => {
    value.current = newValue;
    callback(newValue);
  }, []);

  return [value, setRef];
}

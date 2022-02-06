import React from 'react';

export const base64URLDecode = (input: string) => {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) {
    if (pad === 1) throw new Error('Invalid input !');
    input += new Array(5 - pad).join('=');
  }
  return stringToBytes(atob(input));
};

export function useForceUpdate(): () => void {
  const setValue = React.useState(0)[1];
  return React.useRef(() => setValue((v) => v + 1)).current;
}

/* eslint-disable no-bitwise */
export const stringToBytes = (input: string) => {
  let result: Array<number> = [];
  for (let i = 0; i < input.length; i += 1) {
    let char = input.charCodeAt(i);
    const st = [];
    do {
      st.push(char & 0xff);
      char >>= 8;
    } while (char);
    result = result.concat(st);
  }
  return result;
};

export const bytesToString = (input: number[]) => {
  return input.map((x) => String.fromCharCode(x)).reduce((prev, curr) => prev.concat(curr));
};

export const base64URLEncode = (input: number[]) => {
  let b64 = btoa(bytesToString(input));
  b64 = b64.replace(/\+/g, '-').replace(/\//g, '_');
  return b64;
};

export const UInt32ToBytes = (input: number): number[] => {
  const arr = Array<number>(4);

  arr[0] = input & 0xff;
  arr[1] = (input >> 8) & 0xff;
  arr[2] = (input >> 16) & 0xff;
  arr[3] = (input >> 24) & 0xff;

  return arr.reverse();
};

export const UInt16ToBytes = (input: number): number[] => {
  const arr = Array<number>(2);

  arr[0] = input & 0xff;
  arr[1] = (input >> 8) & 0xff;

  return arr.reverse();
};

export const toUInt32 = (bytes: number[]): number => {
  let result = 0;
  if (bytes.length % 4 !== 0) throw new Error(`Invalid bytes length: ${bytes.length}`);
  for (let i = 0; i < bytes.length; i += 4) {
    result |= bytes[i % 4] << 24;
    result |= bytes[(i % 4) + 1] << 16;
    result |= bytes[(i % 4) + 2] << 8;
    result |= bytes[(i % 4) + 3];
  }
  return result;
};

export const toUInt16 = (bytes: number[]): number => {
  let result = 0;
  if (bytes.length % 2 !== 0) throw new Error(`Invalid bytes length: ${bytes.length}`);
  for (let i = 0; i < bytes.length; i += 2) {
    result |= bytes[i % 2] << 8;
    result |= bytes[(i % 2) + 1];
  }
  return result;
};

export default { base64URLDecode };

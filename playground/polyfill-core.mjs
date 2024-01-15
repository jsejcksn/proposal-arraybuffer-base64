let base64Characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let base64UrlCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

let tag = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag).get;
export function checkUint8Array(arg) {
  let kind;
  try {
    kind = tag.call(arg);
  } catch {
    throw new TypeError('not a Uint8Array');
  }
  if (kind !== 'Uint8Array') {
    throw new TypeError('not a Uint8Array');
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assert failed: ${message}`);
  }
}

function getOptions(options) {
  if (typeof options === 'undefined') {
    return Object.create(null);
  }
  if (options && typeof options === 'object') {
    return options;
  }
  throw new TypeError('options is not object');
}

export function uint8ArrayToBase64(arr, options) {
  checkUint8Array(arr);
  let opts = getOptions(options);
  let alphabet = opts.alphabet;
  if (typeof alphabet === 'undefined') {
    alphabet = 'base64';
  }
  if (alphabet !== 'base64' && alphabet !== 'base64url') {
    throw new TypeError('expected alphabet to be either "base64" or "base64url"');
  }

  let lookup = alphabet === 'base64' ? base64Characters : base64UrlCharacters;
  let result = '';

  let i = 0;
  for (; i + 2 < arr.length; i += 3) {
    let triplet = (arr[i] << 16) + (arr[i + 1] << 8) + arr[i + 2];
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      lookup[(triplet >> 6) & 63] +
      lookup[triplet & 63];
  }
  if (i + 2 === arr.length) {
    let triplet = (arr[i] << 16) + (arr[i + 1] << 8);
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      lookup[(triplet >> 6) & 63] +
      '=';
  } else if (i + 1 === arr.length) {
    let triplet = arr[i] << 16;
    result +=
      lookup[(triplet >> 18) & 63] +
      lookup[(triplet >> 12) & 63] +
      '==';
  }
  return result;
}

function decodeChunk(chunk, alphabet, throwOnExtraBits) {
  let actualChunkLength = chunk.length;
  if (actualChunkLength < 4) {
    chunk += actualChunkLength === 2 ? 'AA' : 'A';
  }

  let map = new Map((alphabet === 'base64' ? base64Characters : base64UrlCharacters).split('').map((c, i) => [c, i]));

  let c1 = chunk[0];
  let c2 = chunk[1];
  let c3 = chunk[2];
  let c4 = chunk[3];
  [c1, c2, c3, c4].forEach(c => {
    if (!map.has(c)) {
      throw new SyntaxError(`unexpected character ${JSON.stringify(c)}`);
    }
  });

  let triplet =
    (map.get(c1) << 18) +
    (map.get(c2) << 12) +
    (map.get(c3) << 6) +
    map.get(c4);

  let chunkBytes = [
    (triplet >> 16) & 255,
    (triplet >> 8) & 255,
    triplet & 255
  ];

  if (actualChunkLength === 2) {
    if (throwOnExtraBits && chunkBytes[1] !== 0) {
      throw new SyntaxError('extra bits');
    }
    return [chunkBytes[0]];
  } else if (actualChunkLength === 3) {
    if (throwOnExtraBits && chunkBytes[2] !== 0) {
      throw new SyntaxError('extra bits');
    }
    return [chunkBytes[0], chunkBytes[1]];
  }
  return chunkBytes;
}

function skipAsciiWhitespace(string, index) {
  for (; index < string.length; ++index) {
    if (!/[\u0009\u000A\u000C\u000D\u0020]/.test(string[index])) {
      break;
    }
  }
  return index;
}

function fromBase64(string, alphabet, lastChunkHandling, maxLength) {
  let read = 0;
  let bytes = [];

  if (maxLength === 0) {
    return { read, bytes };
  }

  let chunk = '';

  let index = 0
  while (true) {
    index = skipAsciiWhitespace(string, index);
    if (index === string.length) {
      if (chunk.length > 0) {
        if (lastChunkHandling === 'stop-before-partial') {
          return { bytes, read };
        } else if (lastChunkHandling === 'loose') {
          if (chunk.length === 1) {
            throw new SyntaxError('malformed padding: exactly one additional character');
          }
          bytes.push(...decodeChunk(chunk, alphabet, false));
        } else {
          assert(lastChunkHandling === 'strict');
          throw new SyntaxError('missing padding');
        }
      }
      return { bytes, read: string.length };
    }
    let char = string[index];
    ++index;
    if (char === '=') {
      if (chunk.length < 2) {
        throw new SyntaxError('padding is too early');
      }
      index = skipAsciiWhitespace(string, index);
      if (chunk.length === 2) {
        if (index === string.length) {
          if (lastChunkHandling === 'stop-before-partial') {
            // two characters then `=` then EOS: this is, technically, a partial chunk
            return { bytes, read };
          }
          throw new SyntaxError('malformed padding - only one =');
        }
        if (string[index] === '=') {
          ++index;
          index = skipAsciiWhitespace(string, index);
        }
      }
      if (index < string.length) {
        throw new SyntaxError('unexpected character after padding');
      }
      bytes.push(...decodeChunk(chunk, alphabet, lastChunkHandling === 'strict'));
      assert(bytes.length <= maxLength);
      return { bytes, read: string.length };
    }
    let remainingBytes = maxLength - bytes.length;
    if (remainingBytes === 1 && chunk.length === 2 || remainingBytes === 2 && chunk.length === 3) {
      // special case: we can fit exactly the number of bytes currently represented by chunk, so we were just checking for `=`
      return { bytes, read };
    }

    chunk += char;
    if (chunk.length === 4) {
      bytes.push(...decodeChunk(chunk, alphabet, false));
      chunk = '';
      read = index;
      assert(bytes.length <= maxLength);
      if (bytes.length === maxLength) {
        return { bytes, read };
      }
    }
  }
}

export function base64ToUint8Array(string, options, into) {
  let opts = getOptions(options);
  let alphabet = opts.alphabet;
  if (typeof alphabet === 'undefined') {
    alphabet = 'base64';
  }
  if (alphabet !== 'base64' && alphabet !== 'base64url') {
    throw new TypeError('expected alphabet to be either "base64" or "base64url"');
  }
  let lastChunkHandling = opts.lastChunkHandling;
  if (typeof lastChunkHandling === 'undefined') {
    lastChunkHandling = 'loose';
  }
  if (!['loose', 'strict', 'stop-before-partial'].includes(lastChunkHandling)) {
    throw new TypeError('expected lastChunkHandling to be either "loose", "strict", or "stop-before-partial"');
  }

  let maxLength = into ? into.length : 2 ** 53 - 1;

  let { bytes, read } = fromBase64(string, alphabet, lastChunkHandling, maxLength);

  bytes = new Uint8Array(bytes);
  if (into) {
    assert(bytes.length <= into.length);
    into.set(bytes);
  }

  return { read, bytes };
}

export function uint8ArrayToHex(arr) {
  checkUint8Array(arr);
  let out = '';
  for (let i = 0; i < arr.length; ++i) {
    out += arr[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function hexToUint8Array(string, into) {
  if (typeof string !== 'string') {
    throw new TypeError('expected string to be a string');
  }
  if (string.length % 2 !== 0) {
    throw new SyntaxError('string should be an even number of characters');
  }
  if (/[^0-9a-fA-F]/.test(string)) {
    throw new SyntaxError('string should only contain hex characters');
  }

  let maxLength = into ? into.length : 2 ** 53 - 1;

  // TODO should hex allow whitespace?
  // TODO should hex support lastChunkHandling? (only 'strict' or 'stop-before-partial')
  let bytes = [];
  let index = 0;
  if (maxLength > 0) {
    while (index < string.length) {
      bytes.push(parseInt(string.slice(index, index + 2), 16));
      index += 2;
      if (bytes.length === maxLength) {
        break;
      }
    }
  }

  bytes = new Uint8Array(bytes);
  if (into) {
    assert(bytes.length <= into.length);
    into.set(bytes);
  }

  return { read: index, bytes };
}

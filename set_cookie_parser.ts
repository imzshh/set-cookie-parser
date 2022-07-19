export interface Cookie {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  path?: string;
  domain?: string;
  [key: string]: string | Date | number | boolean | undefined;
}

export interface ParseOptions {
  decodeValues?: boolean;
  map?: boolean;
  silent?: boolean;
}

const defaultParseOptions: ParseOptions = {
  decodeValues: true,
  map: false,
  silent: false,
};

function isNonEmptyString(str: string) {
  return typeof str === "string" && !!str.trim();
}

export function parseCookieFromString(setCookieValue: string, options?: ParseOptions) : Cookie {
  const parts = setCookieValue.split(";").filter(isNonEmptyString);
  const part = parts.shift();
  if (!part) {
    throw new Error("Invalid set-cookie value: " + setCookieValue);
  }
  const nameValue = part.split("=");
  const name = nameValue.shift();
  if (!name) {
    throw new Error("Invalid set-cookie value: " + setCookieValue);
  }
  let value = nameValue.join("="); // everything after the first =, joined by a "=" if there was more than one part

  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  try {
    value = options.decodeValues ? decodeURIComponent(value) : value; // decode cookie value
  } catch (e) {
    console.error(
      "set-cookie-parser encountered an error while decoding a cookie with value '" +
        value +
        "'. Set options.decodeValues to false to disable this feature.",
      e
    );
  }

  const cookie: Cookie = {
    name: name, // grab everything before the first =
    value: value,
  };

  parts.forEach(function (part: string) {
    const sides = part.split("=");
    const leftSide = sides.shift();
    if (!leftSide) {
      console.warn("Invalid set-cookie value part.", part);
      return;
    }
    const key = leftSide.trimStart().toLowerCase();
    const value = sides.join("=");
    if (key === "expires") {
      cookie.expires = new Date(value);
    } else if (key === "max-age") {
      cookie.maxAge = parseInt(value, 10);
    } else if (key === "secure") {
      cookie.secure = true;
    } else if (key === "httponly") {
      cookie.httpOnly = true;
    } else if (key === "samesite") {
      cookie.sameSite = value;
    } else if (key === "path") {
      cookie.path = value;
    } else if (key === "domain") {
      cookie.domain = value;
    } else {
      cookie[key] = value;
    }
  });

  return cookie;
}

export interface ResponseLike {
  headers?: Headers
}

export function parseCookiesFromResponse(input: ResponseLike, options?: ParseOptions) : Record<string, Cookie> | Cookie[] {
  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  if (!input || !input.headers) {
    if (!options.map) {
      return [];
    } else {
      return {};
    }
  }

  const setCookieValues: string[] = [];
  const headers = input.headers;
  for(const [key, value] of headers.entries()) {
    const lowerCasedKey = key.toLowerCase();
    if (lowerCasedKey === "set-cookie") {
      if (value) {
        setCookieValues.push(value);
      }
    }

    if (lowerCasedKey === "cookie" && !options.silent) {
      console.warn(
        "Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning."
      );
    }
  }

  options = options
    ? Object.assign({}, defaultParseOptions, options)
    : defaultParseOptions;

  if (!options.map) {
    return setCookieValues.filter(isNonEmptyString).map(function (str) {
      return parseCookieFromString(str, options);
    });
  } else {
    const cookies: Record<string, Cookie> = {};
    return setCookieValues.filter(isNonEmptyString).reduce(function (cookies, str) {
      const cookie = parseCookieFromString(str, options);
      cookies[cookie.name] = cookie;
      return cookies;
    }, cookies);
  }
}

/*
  Set-Cookie header field-values are sometimes comma joined in one string. This splits them without choking on commas
  that are within a single set-cookie field-value, such as in the Expires portion.

  This is uncommon, but explicitly allowed - see https://tools.ietf.org/html/rfc2616#section-4.2
  Node.js does this for every header *except* set-cookie - see https://github.com/nodejs/node/blob/d5e363b77ebaf1caf67cd7528224b651c86815c1/lib/_http_incoming.js#L128
  React Native's fetch does this for *every* header, including set-cookie.

  Based on: https://github.com/google/j2objc/commit/16820fdbc8f76ca0c33472810ce0cb03d20efe25
  Credits to: https://github.com/tomball for original and https://github.com/chrusart for JavaScript implementation
*/
export function splitCookiesString(cookiesString: string) {
  if (Array.isArray(cookiesString)) {
    return cookiesString;
  }
  if (typeof cookiesString !== "string") {
    return [];
  }

  const cookiesStrings: string[] = [];
  let pos = 0;
  let start: number;
  let ch: string;
  let lastComma: number;
  let nextStart: number;
  let cookiesSeparatorFound: boolean;

  function skipWhitespace() {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  }

  function notSpecialChar() {
    ch = cookiesString.charAt(pos);

    return ch !== "=" && ch !== ";" && ch !== ",";
  }

  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        // ',' is a cookie separator if we have later first '=', not ';' or ','
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }

        // currently special character
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          // we found cookies separator
          cookiesSeparatorFound = true;
          // pos is inside the next cookie, so back up and return it.
          pos = nextStart;
          cookiesStrings.push(cookiesString.substring(start, lastComma));
          start = pos;
        } else {
          // in param ',' or param separator ';',
          // we continue from that comma
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.substring(start, cookiesString.length));
    }
  }

  return cookiesStrings;
}

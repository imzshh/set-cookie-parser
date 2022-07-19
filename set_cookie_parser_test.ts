import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { parseCookiesFromResponse, parseCookieFromString } from "./set_cookie_parser.ts";

const { test } = Deno;

test({
  name: "parseString: parse single cookie",
  fn(): void {
    const actual = parseCookieFromString("NAME=VALUE; Path=/; Expires=Tue, 18 Jul 2023 10:32:54 GMT;")
    assertEquals(actual, {
      name: "NAME",
      value: "VALUE",
      path: "/",
      expires: new Date("Tue, 18 Jul 2023 10:32:54 GMT"),
    });
  },
});

test({
  name: "parseResponse: parse single cookie",
  fn() {
    const response = new Response();
    response.headers.append("set-cookie", "NAME=VALUE;");
    const actual = parseCookiesFromResponse(response);
    assertEquals(actual, [
      {
        name: "NAME",
        value: "VALUE"
      },
    ])
  }
});

test({
  name: "parseResponse: parse multiple cookies",
  fn() {
    const response = new Response();
    response.headers.append("set-cookie", "NAME=VALUE;");
    response.headers.append("set-cookie", "FOO=BAR;");
    const actual = parseCookiesFromResponse(response);
    assertEquals(actual, [
      {
        name: "NAME",
        value: "VALUE"
      },
      {
        name: "FOO",
        value: "BAR"
      },
    ])
  }
});

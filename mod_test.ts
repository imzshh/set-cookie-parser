import { assert, assertEquals } from "https://deno.land/std/testing/asserts.ts";
import * as mod from "./mod.ts";

const { test } = Deno;

test({
  name: "API assertions",
  fn() {
    assert(mod != null);
    assertEquals(typeof mod.parseString, "function");
    assertEquals(typeof mod.parseResponse, "function");
  }
});
import { describe, expect, it } from "vitest";
import { base64ToUtf8, contractJson, parsePreservingBigNumbers, toId, toU128, utf8ToBase64 } from "../src/index.js";

const BIG = 340282366920938463463374607431768211455n;

describe("contractJson", () => {
  it("writes bigints as bare integer literals", () => {
    expect(contractJson({ budget: 3n * 10n ** 23n, id: 2 })).toBe('{"budget":300000000000000000000000,"id":2}');
  });

  it("keeps the full u128 range exact", () => {
    expect(contractJson({ v: BIG })).toBe(`{"v":${BIG}}`);
  });
});

describe("parsePreservingBigNumbers", () => {
  it("returns 16+ digit numbers as strings, small numbers as numbers", () => {
    const parsed = parsePreservingBigNumbers('{"budget":1000000000000000000000000,"id":3,"list":[12345678901234567890,7]}');
    expect(parsed).toEqual({ budget: "1000000000000000000000000", id: 3, list: ["12345678901234567890", 7] });
  });

  it("handles a bare top-level big number", () => {
    expect(parsePreservingBigNumbers(" 1000000000000000000000000 ")).toBe("1000000000000000000000000");
  });

  it("round-trips a u128 written by contractJson", () => {
    const parsed = parsePreservingBigNumbers(contractJson({ v: BIG })) as { v: string };
    expect(BigInt(parsed.v)).toBe(BIG);
  });
});

describe("base64", () => {
  it("round-trips non-ASCII text", () => {
    const text = '{"title":"Guía de incorporación — café"}';
    expect(base64ToUtf8(utf8ToBase64(text))).toBe(text);
  });
});

describe("guards", () => {
  it("rejects values outside u128", () => {
    expect(() => toU128(-1n)).toThrow(RangeError);
    expect(() => toU128(BIG + 1n)).toThrow(RangeError);
    expect(toU128("42")).toBe(42n);
  });

  it("rejects ids beyond the safe integer range", () => {
    expect(() => toId("9007199254740993")).toThrow(RangeError);
    expect(() => toId(-1)).toThrow(RangeError);
    expect(toId("12")).toBe(12);
  });
});

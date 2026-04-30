import { expect, test, describe } from "bun:test";
import { maskSensitiveData, truncate } from "../src/shared/utils";

describe("Shared Utilities", () => {
  describe("truncate", () => {
    test("should not truncate short strings", () => {
      expect(truncate("hello", 10)).toBe("hello");
    });

    test("should truncate long strings with ellipsis", () => {
      expect(truncate("hello world", 8)).toBe("hello...");
    });
  });

  describe("maskSensitiveData", () => {
    test("should mask API keys with colon", () => {
      expect(maskSensitiveData("api_key: sk-1234567890")).toBe("api_key: sk-1****");
    });

    test("should mask API keys with equals", () => {
      expect(maskSensitiveData("apikey=secret_value_123")).toContain("apikey=");
      expect(maskSensitiveData("apikey=secret_value_123")).toContain("secr****");
    });

    test("should mask tokens in quotes", () => {
      expect(maskSensitiveData('token: "my-secret-token"')).toBe('token: my-s****');
    });

    test("should mask short values completely", () => {
      expect(maskSensitiveData("secret: 123")).toBe("secret: ****");
    });

    test("should handle multiple sensitive keys", () => {
      const input = "api_key: key123, token: token456, password: pw789";
      const result = maskSensitiveData(input);
      expect(result).toContain("api_key: key1****");
      expect(result).toContain("token: toke****");
      expect(result).toContain("password: pw78****");
    });

    test("should ignore non-sensitive patterns", () => {
      const input = "username: admin, port: 8080";
      expect(maskSensitiveData(input)).toBe(input);
    });

    test("should handle null or empty input", () => {
      expect(maskSensitiveData("")).toBe("");
      expect(maskSensitiveData(null as any)).toBe(null);
    });

    test("should be case-insensitive for keys", () => {
      expect(maskSensitiveData("API_KEY: value")).toBe("API_KEY: valu****");
      expect(maskSensitiveData("Secret: value")).toBe("Secret: valu****");
    });
  });
});

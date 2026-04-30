const maskSensitiveData = (text) => {
  if (!text) return text;
  const sensitiveKeys = ["api_key", "apikey", "secret", "token", "password", "auth_token"];
  let masked = text;
  for (const key of sensitiveKeys) {
    const regex = new RegExp(`(${key})\\s*[:=]\\s*["']?([^"'\s,]+)["']?`, "gi");
    masked = masked.replace(regex, (match, k, v) => {
      const maskedVal = v.length > 4 ? v.substring(0, 4) + "****" : "****";
      const separator = match.includes('=') ? '=' : ':';
      return `${k}${separator} ${maskedVal}`;
    });
  }
  return masked;
};

console.log("Test 1:", maskSensitiveData("api_key: sk-1234567890"));
console.log("Test 2:", maskSensitiveData("apikey=secret_value_123"));
console.log("Test 3:", maskSensitiveData('token: "my-secret-token"'));

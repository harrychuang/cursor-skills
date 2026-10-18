// log 遮罩：上傳前在 worker 端本機執行，未遮罩內容不落盤、不出機器。
// 規則：(1) 傳給子程序的環境變數值一律遮罩（過短的值除外，避免把 "1"、"en" 這類
// 泛用字串整份 log 塗掉）；(2) credential pattern（api key / token / secret /
// password / private key）的值一律遮罩。

const CREDENTIAL_PATTERN =
  /((?:api[-_.]?key|access[-_.]?key|token|secret|password|credential|private[-_.]?key)\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi;

const MIN_ENV_VALUE_LENGTH = 8;

export function createMasker({ envValues = [], minLength = MIN_ENV_VALUE_LENGTH } = {}) {
  const values = [...new Set(envValues)]
    .filter((value) => typeof value === "string" && value.length >= minLength)
    .sort((a, b) => b.length - a.length); // 長值先換，避免部分遮罩
  return function mask(text) {
    let out = text;
    for (const value of values) {
      out = out.split(value).join("[redacted]");
    }
    out = out.replace(CREDENTIAL_PATTERN, "$1[redacted]");
    return out;
  };
}

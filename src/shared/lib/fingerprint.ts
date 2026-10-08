const FINGERPRINT_KEY = 'app_fingerprint';
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

let memoryFingerprint: string | null = null;

function generateFingerprint(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

/** Stable 32-hex device id: generated once, persisted in localStorage. */
export function getOrCreateFingerprint(): string {
  if (memoryFingerprint) return memoryFingerprint;

  let value: string | null = null;
  try {
    value = localStorage.getItem(FINGERPRINT_KEY);
  } catch {
    // storage may be unavailable (private mode); fall back to memory
  }

  if (!value || !FINGERPRINT_PATTERN.test(value)) {
    value = generateFingerprint();
    try {
      localStorage.setItem(FINGERPRINT_KEY, value);
    } catch {
      // ignore
    }
  }

  memoryFingerprint = value;
  return value;
}

const FINGERPRINT_KEY = 'app_fingerprint';

export function getOrCreateFingerprint(): string {
  let fp = localStorage.getItem(FINGERPRINT_KEY);
  if (!fp) {
    fp = `fp_${Math.random().toString(36).substring(2)}_${Date.now()}`;
    localStorage.setItem(FINGERPRINT_KEY, fp);
  }
  return fp;
}

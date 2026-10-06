// Phone-a E.164 format-ku maathum. Default country India (+91).
export const normalizePhone = (phone, defaultCountry = "91") => {
  if (!phone) return null;
  const raw = String(phone).trim();
  const digits = raw.replace(/\D/g, "");

  if (raw.startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+${defaultCountry}${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith(defaultCountry)) return `+${digits}`;
  return null;
};
// Step 4-la real providers (SendGrid / Twilio) inga maarum.
// Ovvoru channel-um { ok, providerId, error } return pannanum, throw pannakoodaadhu.
export const deliver = async (channel, reminder) => {
  const to = channel === "email" ? reminder.recipient.email : reminder.recipient.phone;

  if (process.env.MOCK_FAIL === channel) {
    return { ok: false, providerId: null, error: "Mock failure (MOCK_FAIL)" };
  }

  console.log(`[MOCK ${channel}] to=${to} message="${reminder.message}"`);
  return { ok: true, providerId: `mock-${Date.now()}`, error: null };
};
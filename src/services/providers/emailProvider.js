import sgMail from "@sendgrid/mail";

let configured = false;
const configure = () => {
  if (configured) return;
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
    throw new Error("SENDGRID_API_KEY / SENDGRID_FROM missing in .env");
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  configured = true;
};

const escapeHtml = (v) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const sendEmail = async (reminder) => {
  configure();
  const { recipient, title, message, mediaUrl } = reminder;

  const html =
    `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>` +
    (mediaUrl
      ? `<br/><img src="${escapeHtml(mediaUrl)}" alt="Reminder image" style="max-width:600px;" />`
      : "");

  try {
    const [response] = await sgMail.send({
      to: recipient.email,
      from: process.env.SENDGRID_FROM,
      subject: title ? `Reminder: ${title}` : "Reminder",
      text: message,
      html,
    });
    return { ok: true, providerId: response.headers["x-message-id"] || null, error: null };
  } catch (err) {
    const detail = err.response?.body?.errors?.[0]?.message || err.message;
    return { ok: false, providerId: null, error: detail };
  }
};
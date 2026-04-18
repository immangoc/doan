// Mail stub. Hỗ trợ Resend qua RESEND_API_KEY; fallback console + (dev) trả OTP về.
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'no-reply@hungthuy.local';
const DEV_MODE = (Deno.env.get('DEV_MODE') ?? 'true') === 'true';

export async function sendOtpEmail(toEmail: string, otp: string, purpose = 'verification') {
  const subject = 'Hùng Thủy WMS — Mã OTP';
  const html = `<p>Mã OTP của bạn: <b style="font-size:22px">${otp}</b></p><p>Có hiệu lực trong 5 phút.</p>`;
  if (RESEND_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM, to: toEmail, subject, html }),
      });
    } catch (e) { console.error('[mail] resend error:', e); }
  } else {
    console.log(`[mail/STUB] OTP to ${toEmail} (${purpose}): ${otp}`);
  }
}

// Trả OTP trong response chỉ khi DEV_MODE bật và không có Resend key
export function devOtpEcho(otp: string): { devOtp?: string } {
  if (DEV_MODE && !RESEND_KEY) return { devOtp: otp };
  return {};
}

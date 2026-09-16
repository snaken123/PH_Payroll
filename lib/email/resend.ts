export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: string; // Base64 encoded string
  }[];
}

export interface SendEmailResponse {
  success: boolean;
  id?: string;
  error?: string;
  simulated?: boolean;
}

/**
 * Sends an email via Resend HTTP API.
 * Uses process.env.RESEND_API_KEY.
 * Falls back to simulation log if RESEND_API_KEY is not configured.
 */
export async function sendResendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "PH Payroll <onboarding@resend.dev>";

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_resend_api_key_here") {
    console.log(`[Resend Email Simulated] To: ${payload.to} | Subject: ${payload.subject}`);
    return {
      success: true,
      id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      simulated: true,
    };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.name || "Failed to send email via Resend",
      };
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error calling Resend API";
    return {
      success: false,
      error: message,
    };
  }
}

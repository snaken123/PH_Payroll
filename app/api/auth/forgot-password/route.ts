import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendResendEmail } from "@/lib/email/resend";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email address is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "There is no user account with that email address in the system." },
        { status: 404 }
      );
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hour token expiration

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
        <h2 style="color: #2563eb;">PH Payroll - Password Reset Request</h2>
        <p>Hello ${user.name || "User"},</p>
        <p>You recently requested to reset your password for your PH Payroll account. Click the button below to reset it:</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:</p>
        <p style="font-size: 13px; color: #2563eb; word-break: break-all;">${resetUrl}</p>
        <p style="font-size: 13px; color: #64748b; margin-top: 30px;">This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
      </div>
    `;

    await sendResendEmail({
      to: user.email,
      subject: "Password Reset Request - PH Payroll",
      html: emailHtml,
    });

    return NextResponse.json({
      message: "Password reset instructions have been sent to your email address.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while processing your request." },
      { status: 500 }
    );
  }
}

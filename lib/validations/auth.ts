import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const attendanceLoginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type AttendanceLoginInput = z.infer<typeof attendanceLoginSchema>;

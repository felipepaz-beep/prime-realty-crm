import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo de 6 caracteres"),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Mínimo de 8 caracteres")
    .max(72, "Máximo de 72 caracteres"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

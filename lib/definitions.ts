import * as z from "zod";

export const SignupFormSchema = z.object({
  name: z
    .string()
    .min(2, { error: "O nome precisa ter pelo menos 2 caracteres." })
    .trim(),
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z
    .string()
    .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
    .regex(/[a-zA-Z]/, { error: "A senha precisa ter pelo menos uma letra." })
    .regex(/[0-9]/, { error: "A senha precisa ter pelo menos um número." })
    .trim(),
});

export const LoginFormSchema = z.object({
  email: z.email({ error: "Informe um e-mail válido." }).trim(),
  password: z.string().min(1, { error: "Informe a senha." }),
});

export type FormState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
};

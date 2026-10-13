import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Criar conta"
      description="A senha fica armazenada de forma criptografada. Ela precisa ter pelo menos 8 caracteres, uma letra e um número."
    >
      <SignupForm />
    </AuthShell>
  );
}

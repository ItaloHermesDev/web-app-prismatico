import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar"
      description="Entre para ver o plano do dia e marcar as refeições."
    >
      <LoginForm />
    </AuthShell>
  );
}

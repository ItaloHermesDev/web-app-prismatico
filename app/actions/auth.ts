"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  createUser,
  findUserByEmail,
  isDuplicateEmailError,
} from "@/lib/db";
import {
  LoginFormSchema,
  SignupFormSchema,
  type FormState,
} from "@/lib/definitions";
import { createSession, deleteSession } from "@/lib/session";

export async function signup(
  _state: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = validatedFields.data;
  const passwordHash = await bcrypt.hash(password, 10);

  let userId: number;
  try {
    userId = await createUser({ name, email, passwordHash });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return { message: "Já existe uma conta com esse e-mail." };
    }
    console.error("Falha ao criar usuário");
    return { message: "Não foi possível criar a conta. Tente de novo." };
  }

  await createSession(userId);
  redirect("/hoje");
}

export async function login(
  _state: FormState | undefined,
  formData: FormData,
): Promise<FormState> {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;

  try {
    const user = await findUserByEmail(email);
    const passwordMatches = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      return { message: "E-mail ou senha inválidos." };
    }

    await createSession(user.id);
  } catch (error) {
    console.error("Falha ao entrar", error);
    return { message: "Não foi possível entrar. Tente de novo." };
  }

  redirect("/hoje");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

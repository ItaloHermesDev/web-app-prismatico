import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const protectedRoutes = ["/hoje", "/semana", "/desempenho", "/plano", "/painel"];
const authRoutes = ["/login", "/cadastro"];

async function readUserId(token: string | undefined) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const userId = await readUserId(request.cookies.get("session")?.value);

  if (protectedRoutes.some((route) => path.startsWith(route)) && !userId) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if (authRoutes.includes(path) && userId) {
    return NextResponse.redirect(new URL("/hoje", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "aevan_cleaning_crm_super_secure_jwt_secret_key_2026_x893kldsa"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("aevan_session")?.value;
    if (!token) return null;
    const session = await verifySessionToken(token);
    if (!session) return null;

    try {
      // 1. Try finding by ID
      let dbUser = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true, email: true, name: true, role: true, isActive: true },
      });

      // 2. If not found by ID (e.g. legacy session cookie or reseeded DB), find by email
      if (!dbUser && session.email) {
        dbUser = await prisma.user.findUnique({
          where: { email: session.email.toLowerCase().trim() },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });
      }

      // 3. If still not found and user has Superadmin role, link to active system superadmin
      if (!dbUser && session.role === Role.SUPERADMIN) {
        dbUser = await prisma.user.findFirst({
          where: { role: Role.SUPERADMIN, isActive: true },
          select: { id: true, email: true, name: true, role: true, isActive: true },
        });
      }

      if (dbUser && dbUser.isActive) {
        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        };
      }
    } catch (dbErr) {
      console.warn("DB user sync in getCurrentUser fallback to session token:", dbErr);
    }

    return session;
  } catch {
    return null;
  }
}

export const getSession = getCurrentUser;

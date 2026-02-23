// src/lib/jwt.ts
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET!;
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  role: "OWNER" | "TENANT" | "ADMIN";
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload;
}

/**
 * Extract and verify JWT from Authorization header.
 * Returns the payload or null if invalid/missing.
 */
export function getAuthUser(req: NextRequest): JWTPayload | null {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return verifyToken(token);
  } catch {
    return null;
  }
}

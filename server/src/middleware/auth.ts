import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthPayload {
  userId: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      personId?: string;
    }
  }
}

export function requireCaregiver(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireDevice(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const personId = req.headers["x-person-id"] as string | undefined;
  const deviceToken = req.headers["x-device-token"] as string | undefined;

  if (!personId || !deviceToken) {
    res.status(401).json({ error: "Device not authenticated" });
    return;
  }

  req.personId = personId;
  req.headers["x-device-token"] = deviceToken;
  next();
}

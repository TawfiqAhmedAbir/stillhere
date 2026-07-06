import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/db.js";
import { requireCaregiver } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name required" });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: "30d" }
  );

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.get("/me", requireCaregiver, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, email: true, name: true },
  });
  res.json({ user });
});

router.post("/push-subscribe", requireCaregiver, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) {
    res.status(400).json({ error: "subscription required" });
    return;
  }

  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { pushSubscription: JSON.stringify(subscription) },
  });

  res.json({ ok: true });
});

export default router;

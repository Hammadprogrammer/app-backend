import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign({ userId }, secret, { expiresIn: TOKEN_EXPIRY });
}

/** POST /api/auth/signup */
export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { name, phone, email, password } = req.body as {
      name?: string;
      phone?: string;
      email?: string;
      password?: string;
    };

    if (!name?.trim() || !phone?.trim() || !password) {
      res.status(400).json({ success: false, message: 'name, phone and password are required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { phone: phone.trim() } });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this phone already exists' });
      return;
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        password: hashed,
      },
      select: { id: true, name: true, phone: true, email: true, createdAt: true },
    });

    const token = signToken(user.id);

    res.status(201).json({ success: true, data: { user, token } });
  } catch (err) {
    console.error('[auth.signup]', err);
    res.status(500).json({ success: false, message: 'Failed to create account' });
  }
}

/** POST /api/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { phone, password } = req.body as { phone?: string; password?: string };

    if (!phone?.trim() || !password) {
      res.status(400).json({ success: false, message: 'phone and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { phone: phone.trim() } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ success: false, message: 'Invalid phone or password' });
      return;
    }

    const token = signToken(user.id);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
        token,
      },
    });
  } catch (err) {
    console.error('[auth.login]', err);
    res.status(500).json({ success: false, message: 'Failed to log in' });
  }
}

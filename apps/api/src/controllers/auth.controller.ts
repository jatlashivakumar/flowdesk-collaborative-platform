import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_COOKIE_OPTIONS } from '../utils/tokens';
import { AppError } from '../utils/AppError';
import { asyncHandler, sendSuccess, serializeUser } from '../utils/helpers';
import { emailService } from '../services/email.service';
import type { AuthRequest } from '../middleware/auth.middleware';

const SALT_ROUNDS = 12;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password, name } = req.body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing?.email === email) throw AppError.conflict('Email already registered');
  if (existing?.username === username) throw AppError.conflict('Username taken');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, username, passwordHash, name: name ?? null },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });

  await emailService.sendWelcome(email, name ?? username);

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { accessToken, user: serializeUser(user) }, 'Account created', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized('Invalid credentials');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorized('Invalid credentials');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { accessToken, user: serializeUser(user) });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw AppError.unauthorized('No refresh token');

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw AppError.unauthorized('Refresh token expired or invalid');
  }

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw AppError.unauthorized();

  // Rotate tokens
  await prisma.refreshToken.delete({ where: { token } });
  const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = signRefreshToken({ userId: user.id });

  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) },
  });

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
  sendSuccess(res, { accessToken: newAccessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
  }
  res.clearCookie('refreshToken');
  sendSuccess(res, null, 'Logged out');
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw AppError.notFound('User not found');
  sendSuccess(res, serializeUser(user));
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, bio } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { name, bio },
  });
  sendSuccess(res, serializeUser(user), 'Profile updated');
});

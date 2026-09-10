import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';

export const generateToken = (res: Response, userId: string) => {
  const secret = process.env.JWT_SECRET || 'livwee_secret_key_2026';
  const options: SignOptions = {
    expiresIn: '30d'
  };
  const token = jwt.sign({ userId }, secret, options);

  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
};

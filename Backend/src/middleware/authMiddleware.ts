import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserType } from '../models/User';
import { IRole } from '../models/Role';
import { ALL_PERMISSIONS } from '../config/permissions';

export interface AuthRequest extends Request {
  user?: IUser;
  userPermissions?: string[];
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'livwee_secret_key_2026';
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, secret) as { userId: string };
    } catch {
      decoded = jwt.verify(token, 'medikit_secret_key_2026') as { userId: string };
    }

    const user = await User.findById(decoded.userId).populate('roles');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    if (user.status !== 'ACTIVE' || user.deleted_at) {
      return res.status(403).json({ message: 'Account is inactive or suspended' });
    }

    req.user = user;

    // Compute active permissions
    if (user.type === UserType.SUPER_ADMIN) {
      req.userPermissions = ALL_PERMISSIONS;
    } else {
      const permsSet = new Set<string>();
      if (Array.isArray(user.roles)) {
        for (const roleObj of user.roles) {
          const role = roleObj as unknown as IRole;
          if (role && Array.isArray(role.permissions)) {
            role.permissions.forEach(p => permsSet.add(p));
          }
        }
      }
      req.userPermissions = Array.from(permsSet);
    }

    next();
  } catch (error) {
    console.error('JWT Auth Error:', error);
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.type === UserType.SUPER_ADMIN) {
      return next();
    }

    if (req.userPermissions && req.userPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({ 
      message: `Forbidden: Requires '${permission}' permission` 
    });
  };
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && (req.user.type === UserType.SUPER_ADMIN || req.user.type === UserType.ADMIN)) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Admin access required' });
};

export const superAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.type === UserType.SUPER_ADMIN) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: Super Admin access required' });
};

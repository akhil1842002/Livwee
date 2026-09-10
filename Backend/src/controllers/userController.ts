import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, Role } from '../models';
import { logAudit } from '../utils/auditLogger';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ deleted_at: null }).populate('roles').sort({ createdAt: -1 });
    const formatted = users.map(u => ({
      id: u._id.toString(),
      _id: u._id,
      name: u.name,
      email: u.email,
      type: u.type,
      roles: Array.isArray(u.roles) ? u.roles.map((r: any) => r.name || r) : [],
      status: u.status || 'ACTIVE',
      accentColor: u.accent_color || '#7C3AED',
      avatar: u.avatar_url || '',
      lastLogin: new Date((u as any).updatedAt || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      canLogin: u.status === 'ACTIVE'
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching users' });
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, type = 'STAFF', role, accentColor, avatar } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    let roleObj = null;
    if (role) {
      roleObj = await Role.findOne({ name: new RegExp(`^${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!roleObj) {
        roleObj = await Role.create({ name: role, description: `${role} system role`, permissions: [] });
      }
    }

    const user = await User.create({
      name,
      email,
      password_hash,
      type,
      status: 'ACTIVE',
      roles: roleObj ? [roleObj._id] : [],
      accent_color: accentColor || '#7C3AED',
      avatar_url: avatar || ''
    });

    await logAudit({
      req,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user._id.toString(),
      desc: `Created new staff user "${user.name}" (${user.email}) with role: ${type}`,
      severity: 'INFO',
      payload: { name: user.name, email: user.email, type: user.type }
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        type: user.type,
        roles: role ? [role] : [],
        status: user.status,
        accentColor: user.accent_color,
        avatar: user.avatar_url,
        lastLogin: 'Just now',
        canLogin: true
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating user' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { name, email, type, role, status, accentColor, avatar } = req.body;

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // 1. Prevent user from modifying their own assigned role
    if (authReq.user && (authReq.user._id.toString() === targetUser._id.toString() || authReq.user.email === targetUser.email)) {
      if (role) {
        const currentRoles = await Role.find({ _id: { $in: targetUser.roles } });
        const currentRoleName = currentRoles[0]?.name;
        if (currentRoleName && currentRoleName.toLowerCase() !== role.toLowerCase()) {
          return res.status(400).json({ message: 'Security Policy: You cannot modify your own assigned authorization role.' });
        }
      }
    }

    // 2. Prevent Super Admin deactivation
    if (targetUser.type === 'SUPER_ADMIN' || targetUser.email === 'akhil1842002@gmail.com') {
      if (status && status !== 'ACTIVE') {
        return res.status(400).json({ message: 'Super Admin accounts cannot be deactivated.' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (accentColor) updateData.accent_color = accentColor;
    if (typeof avatar !== 'undefined') updateData.avatar_url = avatar;

    if (role) {
      let roleObj = await Role.findOne({ name: new RegExp(`^${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!roleObj) {
        roleObj = await Role.create({ name: role, description: `${role} system role`, permissions: [] });
      }
      updateData.roles = [roleObj._id];
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('roles');
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logAudit({
      req,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: user._id.toString(),
      desc: `Updated account details for user "${user.name}" (${user.email})`,
      severity: 'INFO',
      payload: { name: user.name, email: user.email, status: user.status, type: user.type }
    });

    res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        type: user.type,
        roles: Array.isArray(user.roles) ? user.roles.map((r: any) => r.name || r) : [role],
        status: user.status,
        accentColor: user.accent_color,
        avatar: user.avatar_url,
        lastLogin: new Date((user as any).updatedAt || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        canLogin: user.status === 'ACTIVE'
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating user' });
  }
};

export const resetUserPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(req.params.id, { password_hash }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await logAudit({
      req,
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: user._id.toString(),
      desc: `Admin reset password for user account "${user.name}" (${user.email})`,
      severity: 'WARNING'
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error resetting password' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Super Admin non-deletable protection
    if (targetUser.type === 'SUPER_ADMIN' || targetUser.email === 'akhil1842002@gmail.com') {
      return res.status(400).json({ message: 'Security Alert: Super Admin accounts cannot be deleted from the system.' });
    }

    // Prevent self-deletion
    if (authReq.user && (authReq.user._id.toString() === targetUser._id.toString() || authReq.user.email === targetUser.email)) {
      return res.status(400).json({ message: 'Security Alert: You cannot delete your own active user account.' });
    }

    await User.findByIdAndUpdate(req.params.id, { deleted_at: new Date() });

    await logAudit({
      req,
      action: 'USER_DELETED',
      entity: 'User',
      entityId: req.params.id,
      desc: `Soft-deleted user account "${targetUser.name}" (${targetUser.email})`,
      severity: 'CRITICAL',
      payload: { name: targetUser.name, email: targetUser.email, type: targetUser.type }
    });

    res.json({ success: true, message: 'User account deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting user' });
  }
};


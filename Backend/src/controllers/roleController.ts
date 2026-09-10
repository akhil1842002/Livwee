import { Request, Response } from 'express';
import { Role, User } from '../models';
import { logAudit } from '../utils/auditLogger';

export const getRoles = async (req: Request, res: Response) => {
  try {
    let roles = await Role.find().sort({ createdAt: 1 });
    if (roles.length === 0) {
      await Role.create([
        {
          name: 'Super Admin',
          description: 'Full system administration and unrestricted access',
          permissions: ['*']
        },
        {
          name: 'Pharmacy Supervisor',
          description: 'Supervises store inventory, sales counter, and customer billing',
          permissions: ['products.view', 'products.create', 'products.update', 'inventory.view', 'inventory.adjust', 'sales.view', 'sales.create', 'sales.cancel', 'sales.return', 'billing.view', 'billing.create', 'billing.update', 'billing.print', 'suppliers.view', 'purchases.view', 'purchases.create', 'purchases.receive', 'reports.view']
        }
      ]);
      roles = await Role.find().sort({ createdAt: 1 });
    }
    const formatted = await Promise.all(
      roles.map(async (r) => {
        const usersCount = await User.countDocuments({ roles: r._id, deleted_at: null });
        return {
          id: r._id.toString(),
          _id: r._id,
          name: r.name,
          code: r.name.toUpperCase().replace(/\s+/g, '_'),
          description: r.description || '',
          color: 'violet',
          usersCount: usersCount,
          isSystem: r.name === 'Super Admin' || r.name === 'Pharmacy Supervisor',
          permissions: r.permissions || []
        };
      })
    );
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching roles' });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissions = [] } = req.body;
    if (!name) return res.status(400).json({ message: 'Role name is required' });

    const role = await Role.create({ name, description, permissions });

    await logAudit({
      req,
      action: 'ROLE_CREATED',
      entity: 'Role',
      entityId: role._id.toString(),
      desc: `Created new RBAC role "${role.name}" with ${role.permissions.length} permissions`,
      severity: 'CRITICAL',
      payload: { name: role.name, permissions: role.permissions }
    });

    res.status(201).json({
      success: true,
      data: {
        id: role._id.toString(),
        name: role.name,
        code: role.name.toUpperCase().replace(/\s+/g, '_'),
        description: role.description || '',
        color: 'violet',
        usersCount: 0,
        isSystem: false,
        permissions: role.permissions
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating role' });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const { name, description, permissions } = req.body;

    const targetRole = await Role.findById(req.params.id);
    if (!targetRole) return res.status(404).json({ message: 'Role not found' });

    // Check if role is assigned to the current requesting user
    if (authReq.user && Array.isArray(authReq.user.roles)) {
      const isAssignedToSelf = authReq.user.roles.some((r: any) =>
        r._id?.toString() === targetRole._id.toString() ||
        r.toString() === targetRole._id.toString() ||
        r.name === targetRole.name
      );
      if (isAssignedToSelf && targetRole.name !== 'Super Admin') {
        return res.status(400).json({ message: 'Security Policy: You cannot modify the privileges or details of a security role assigned to your own active account.' });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;

    const role = await Role.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    const usersCount = await User.countDocuments({ roles: role._id, deleted_at: null });

    await logAudit({
      req,
      action: 'ROLE_UPDATED',
      entity: 'Role',
      entityId: role._id.toString(),
      desc: `Updated RBAC security role details and permissions for "${role.name}"`,
      severity: 'CRITICAL',
      payload: { name: role.name, permissions: role.permissions }
    });

    res.json({
      success: true,
      data: {
        id: role._id.toString(),
        name: role.name,
        code: role.name.toUpperCase().replace(/\s+/g, '_'),
        description: role.description || '',
        color: 'violet',
        usersCount,
        isSystem: role.name === 'Super Admin' || role.name === 'Pharmacy Supervisor',
        permissions: role.permissions
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating role' });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: 'Role not found' });
    if (role.name === 'Super Admin') {
      return res.status(400).json({ message: 'System role "Super Admin" cannot be deleted.' });
    }

    // Check if role is assigned to the current requesting user
    if (authReq.user && Array.isArray(authReq.user.roles)) {
      const isAssignedToSelf = authReq.user.roles.some((r: any) =>
        r._id?.toString() === role._id.toString() ||
        r.toString() === role._id.toString() ||
        r.name === role.name
      );
      if (isAssignedToSelf) {
        return res.status(400).json({ message: 'Security Alert: You cannot delete a security role that is currently assigned to your own active login account.' });
      }
    }

    await Role.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'ROLE_DELETED',
      entity: 'Role',
      entityId: req.params.id,
      desc: `Deleted RBAC security role "${role.name}"`,
      severity: 'CRITICAL',
      payload: { name: role.name }
    });

    res.json({ success: true, message: 'Role deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting role' });
  }
};


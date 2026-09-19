import prisma from '../prisma';
import { AdminRole } from '@prisma/client';

export class AuditService {
  async log(
    adminId: string,
    action: string,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          adminId,
          action,
          resource,
          resourceId,
          details: details || {},
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      console.error('Audit log error:', error);
    }
  }

  async logAdminAction(
    adminId: string,
    action: string,
    entityType: string,
    entityId?: string,
    oldValue?: Record<string, any>,
    newValue?: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.adminAction.create({
        data: {
          adminId,
          action,
          entityType,
          entityId,
          oldValue: oldValue || {},
          newValue: newValue || {},
          ipAddress,
        },
      });
    } catch (error) {
      console.error('Admin action log error:', error);
    }
  }

  async getAuditLogs(
    page: number = 1,
    limit: number = 50,
    adminId?: string,
    action?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (adminId) where.adminId = adminId;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { admin: { select: { username: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, totalPages: Math.ceil(total / limit) };
  }
}

export const auditService = new AuditService();

export class RBACService {
  private permissions: Record<AdminRole, string[]> = {
    owner: ['*'],
    admin: [
      'keys:create', 'keys:read', 'keys:update', 'keys:delete',
      'devices:read', 'devices:reset',
      'logs:read',
      'webhooks:create', 'webhooks:read', 'webhooks:update', 'webhooks:delete',
      'api-keys:create', 'api-keys:read', 'api-keys:delete',
      'admins:read',
    ],
    editor: [
      'keys:create', 'keys:read', 'keys:update',
      'devices:read', 'devices:reset',
      'logs:read',
    ],
    viewer: [
      'keys:read',
      'devices:read',
      'logs:read',
    ],
  };

  hasPermission(role: AdminRole, permission: string): boolean {
    const rolePermissions = this.permissions[role];
    return rolePermissions.includes('*') || rolePermissions.includes(permission);
  }

  filterPermissions(role: AdminRole, data: Record<string, any>): Record<string, any> {
    if (this.hasPermission(role, '*')) return data;

    const filtered: Record<string, any> = {};
    const allowedFields = [
      'keys:read', 'keys:create', 'keys:update', 'keys:delete',
      'devices:read', 'devices:reset',
      'logs:read',
      'webhooks:read',
      'api-keys:read',
      'admins:read',
    ];

    const rolePermissions = this.permissions[role];
    
    if (rolePermissions.includes('keys:read')) {
      Object.keys(data).forEach(key => {
        if (!['password', 'totpSecret'].includes(key)) {
          filtered[key] = data[key];
        }
      });
    }

    return filtered;
  }
}

export const rbacService = new RBACService();

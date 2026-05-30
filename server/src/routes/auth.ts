import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import knex from '../db/knex';
import { config } from '../config';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) {
      return res.status(400).json({ message: '请输入员工编号和密码' });
    }

    const employee = await knex('Employee').where('employee_id', employee_id).first();
    if (!employee) {
      return res.status(401).json({ message: '员工编号或密码错误' });
    }

    const valid = await bcrypt.compare(password, employee.password_hash || '');
    if (!valid) {
      return res.status(401).json({ message: '员工编号或密码错误' });
    }

    // Get roles
    const empRoles = await knex('EmployeeRole')
      .join('Role', 'EmployeeRole.role_id', 'Role.role_id')
      .where('EmployeeRole.employee_id', employee_id)
      .select('Role.role_id', 'Role.role_name');

    const roles = empRoles.map((r: any) => r.role_name);
    const roleIds = empRoles.map((r: any) => r.role_id);

    // Get permissions
    const perms = await knex('RolePermission')
      .join('Permission', 'RolePermission.permission_id', 'Permission.permission_id')
      .whereIn('RolePermission.role_id', roleIds)
      .select('Permission.permission_name')
      .distinct();

    const permissions = perms.map((p: any) => p.permission_name);

    const token = jwt.sign(
      { employee_id: employee.employee_id, roles },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as any
    );

    const { password_hash, ...emp } = employee;
    return res.json({ token, employee: emp, roles, permissions });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const employee = await knex('Employee').where('employee_id', user.employee_id).first();
    if (!employee) {
      return res.status(404).json({ message: '员工不存在' });
    }

    const empRoles = await knex('EmployeeRole')
      .join('Role', 'EmployeeRole.role_id', 'Role.role_id')
      .where('EmployeeRole.employee_id', user.employee_id)
      .select('Role.role_name');

    const roles = empRoles.map((r: any) => r.role_name);
    const { password_hash, ...emp } = employee;
    return res.json({ employee: emp, roles });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
});

export default router;

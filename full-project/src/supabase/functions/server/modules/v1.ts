// /api/v1/* router root — gom các module port từ warehouse-service
import { Hono } from 'npm:hono';
import auth from './auth/auth.routes.ts';
import { userRoutes, userAdminRoutes } from './user/user.routes.ts';
import container from './container/container.routes.ts';
import yard from './yard/yard.routes.ts';

const v1 = new Hono();

v1.get('/health', (c) => c.json({ status: 'ok', api: 'v1', ts: new Date().toISOString() }));

v1.route('/auth', auth);
v1.route('/users', userRoutes);
v1.route('/admin', userAdminRoutes);
v1.route('/', container); // routes self-prefix với /admin/containers, /admin/cargo-types, ...
v1.route('/', yard);      // routes self-prefix với /admin/yards, /admin/zones, /admin/blocks, /admin/slots, /admin/yard, /admin/yard-types, /admin/block-types

export default v1;

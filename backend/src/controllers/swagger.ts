import { Request, Response } from 'express';

const swaggerDoc = {
  openapi: '3.0.0',
  info: {
    title: 'License Key Server API',
    version: '1.0.0',
    description: 'License key validation system with admin management',
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Local server' },
  ],
  paths: {
    '/api/check': {
      get: {
        summary: 'Validate license key',
        description: 'iOS client endpoint to validate license key and check device binding',
        parameters: [
          { name: 'udid', in: 'query', required: true, schema: { type: 'string' }, description: 'Device UDID' },
          { name: 'key', in: 'query', required: true, schema: { type: 'string' }, description: 'License key' },
          { name: 'lockdevice', in: 'query', required: true, schema: { type: 'string' }, description: 'Bundle ID' },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'true' },
                    uuid: { type: 'string', example: 'device-uuid' },
                    end_time: { type: 'string', example: '2024-12-31 23:59:59' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid request' },
        },
      },
    },
    '/api/admin/login': {
      post: {
        summary: 'Admin login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['username', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    username: { type: 'string' },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/admin/keys': {
      get: {
        summary: 'List license keys',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { enum: ['active', 'expired', 'banned'] } },
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Create license key',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  expiresAt: { type: 'string', format: 'date-time' },
                  maxDevices: { type: 'integer', default: 1 },
                },
                required: ['expiresAt'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/admin/keys/{id}': {
      patch: {
        summary: 'Update license key',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  expiresAt: { type: 'string', format: 'date-time' },
                  maxDevices: { type: 'integer' },
                  status: { type: 'string', enum: ['active', 'expired', 'banned'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Delete license key',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/admin/keys/{id}/devices': {
      get: {
        summary: 'Get devices for key',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/admin/keys/{id}/reset': {
      post: {
        summary: 'Reset devices for key',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/admin/logs': {
      get: {
        summary: 'Search logs',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { enum: ['success', 'fail'] } },
        ],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/admin/stats': {
      get: {
        summary: 'Get dashboard stats',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Success' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

export function getSwaggerDoc(req: Request, res: Response) {
  res.json(swaggerDoc);
}
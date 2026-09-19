import { Router, Request, Response } from 'express';

const router = Router();

const metrics = {
  httpRequestsTotal: 0,
  httpRequestsByMethod: { GET: 0, POST: 0, PATCH: 0, DELETE: 0 },
  httpRequestsByStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
  validationRequestsTotal: 0,
  validationRequestsSuccess: 0,
  validationRequestsFail: 0,
  activeKeysTotal: 0,
  devicesTotal: 0,
  uptime: process.uptime(),
};

setInterval(() => {
  metrics.uptime = process.uptime();
}, 60000);

export function recordRequest(method: string, statusCode: number): void {
  metrics.httpRequestsTotal++;
  metrics.httpRequestsByMethod[method as keyof typeof metrics.httpRequestsByMethod]++;
  
  if (statusCode >= 200 && statusCode < 300) metrics.httpRequestsByStatus['2xx']++;
  else if (statusCode >= 300 && statusCode < 400) metrics.httpRequestsByStatus['3xx']++;
  else if (statusCode >= 400 && statusCode < 500) metrics.httpRequestsByStatus['4xx']++;
  else metrics.httpRequestsByStatus['5xx']++;
}

export function recordValidation(success: boolean): void {
  metrics.validationRequestsTotal++;
  if (success) metrics.validationRequestsSuccess++;
  else metrics.validationRequestsFail++;
}

export function updateGauge(name: string, value: number): void {
  if (name in metrics) {
    (metrics as any)[name] = value;
  }
}

router.get('/', (req: Request, res: Response) => {
  res.set('Content-Type', 'text/plain');
  
  const output = `
# HELP license_server_http_requests_total Total HTTP requests
# TYPE license_server_http_requests_total counter
license_server_http_requests_total ${metrics.httpRequestsTotal}

# HELP license_server_http_requests_by_method HTTP requests by method
# TYPE license_server_http_requests_by_method counter
${Object.entries(metrics.httpRequestsByMethod).map(([method, count]) => 
  `license_server_http_requests_by_method{method="${method}"} ${count}`
).join('\n')}

# HELP license_server_http_requests_by_status HTTP requests by status code
# TYPE license_server_http_requests_by_status counter
${Object.entries(metrics.httpRequestsByStatus).map(([status, count]) => 
  `license_server_http_requests_by_status{status="${status}"} ${count}`
).join('\n')}

# HELP license_server_validation_requests_total Total validation requests
# TYPE license_server_validation_requests_total counter
license_server_validation_requests_total ${metrics.validationRequestsTotal}

# HELP license_server_validation_requests_success Successful validations
# TYPE license_server_validation_requests_success counter
license_server_validation_requests_success ${metrics.validationRequestsSuccess}

# HELP license_server_validation_requests_fail Failed validations
# TYPE license_server_validation_requests_fail counter
license_server_validation_requests_fail ${metrics.validationRequestsFail}

# HELP license_server_uptime_seconds Server uptime in seconds
# TYPE license_server_uptime_seconds gauge
license_server_uptime_seconds ${metrics.uptime.toFixed(2)}
`.trim();

  res.send(output);
});

export default router;

/**
 * FreeLang v2 stdlib — stdlib-http-errors.ts
 * npm http-errors 완전 대체 네이티브 함수 등록
 */

import { NativeFunctionRegistry } from './vm/native-function-registry';

const STATUS_MESSAGES: Record<number, string> = {
  100: 'Continue', 101: 'Switching Protocols',
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required',
  403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
  406: 'Not Acceptable', 408: 'Request Timeout', 409: 'Conflict',
  410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed',
  413: 'Payload Too Large', 414: 'URI Too Long', 415: 'Unsupported Media Type',
  422: 'Unprocessable Entity', 423: 'Locked', 424: 'Failed Dependency',
  429: 'Too Many Requests', 451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout', 505: 'HTTP Version Not Supported'
};

const HTTP_ERROR_BRAND = Symbol('HttpError');

interface HttpError {
  status: number;
  message: string;
  name: string;
  expose: boolean;
  [HTTP_ERROR_BRAND]: true;
}

function createHttpError(status: number, message: string): HttpError {
  const defaultMsg = STATUS_MESSAGES[status] ?? 'Unknown Error';
  const msg = message || defaultMsg;
  const expose = status < 500;
  const name = (defaultMsg.replace(/\s/g, '') || 'Error') + 'Error';
  return { status, message: msg, name, expose, [HTTP_ERROR_BRAND]: true };
}

export function registerHttpErrorsFunctions(registry: NativeFunctionRegistry): void {
  registry.register({
    name: 'httperr_create',
    module: 'http-errors',
    paramCount: 2,
    executor: (args: any[]) => {
      const status = Number(args[0]) || 500;
      const message = String(args[1] ?? '');
      return createHttpError(status, message);
    }
  });

  registry.register({
    name: 'httperr_is_http_error',
    module: 'http-errors',
    paramCount: 1,
    executor: (args: any[]) => {
      const err = args[0];
      if (!err || typeof err !== 'object') return false;
      return (
        HTTP_ERROR_BRAND in err ||
        (typeof err.status === 'number' && err.status >= 400 && typeof err.message === 'string')
      );
    }
  });

  registry.register({
    name: 'httperr_status_message',
    module: 'http-errors',
    paramCount: 1,
    executor: (args: any[]) => STATUS_MESSAGES[Number(args[0])] ?? 'Unknown'
  });
}

import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const status = exception.getStatus();
    const res = exception.getResponse() as Record<string, unknown>;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      code: res.code || 'ERROR',
      message: res.message || res,
    });
  }
}

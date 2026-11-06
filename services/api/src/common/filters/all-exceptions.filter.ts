import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected server error occurred. Please try again shortly.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
        } else if (resObj.message) {
          message = String(resObj.message);
        }
        error = resObj.error || exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `[${request.method} ${request.url}] Prisma KnownRequestError [${exception.code}]: ${exception.message}`,
        JSON.stringify(exception.meta || {}),
      );

      switch (exception.code) {
        case 'P2000': {
          status = HttpStatus.BAD_REQUEST;
          const col = (exception.meta?.column_name as string) || 'a submitted field';
          message = `The provided value for ${col} exceeds the allowed length. Please shorten it.`;
          error = 'Value Too Long';
          break;
        }
        case 'P2001': {
          status = HttpStatus.NOT_FOUND;
          message = 'The requested database record does not exist.';
          error = 'Not Found';
          break;
        }
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const rawTarget = exception.meta?.target;
          let target = '';
          if (Array.isArray(rawTarget)) {
            target = rawTarget.join(', ');
          } else if (typeof rawTarget === 'string') {
            target = rawTarget.replace(/^.*_(.*)_key$/, '$1');
          }
          message = target
            ? `An account or record with this ${target} already exists.`
            : 'A record with these details already exists.';
          error = 'Conflict';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          const field = (exception.meta?.field_name as string) || '';
          message = field
            ? `Invalid relation reference: ${field} does not exist.`
            : 'Invalid reference: related entity does not exist.';
          error = 'Bad Request';
          break;
        }
        case 'P2005':
        case 'P2006':
        case 'P2007': {
          status = HttpStatus.BAD_REQUEST;
          const field = (exception.meta?.field_name as string) || '';
          message = field
            ? `Invalid data format provided for ${field}. Please verify your entry.`
            : 'Invalid data format provided. Please check your entries and try again.';
          error = 'Validation Error';
          break;
        }
        case 'P2011': {
          status = HttpStatus.BAD_REQUEST;
          const constraint = (exception.meta?.constraint as string) || '';
          message = constraint
            ? `Required field "${constraint}" is missing. Please provide it.`
            : 'A required field is missing. Please fill in all required fields.';
          error = 'Missing Field';
          break;
        }
        case 'P2012':
        case 'P2013': {
          status = HttpStatus.BAD_REQUEST;
          const path = (exception.meta?.path as string) || (exception.meta?.argument_name as string) || '';
          message = path
            ? `Missing required parameter: ${path}.`
            : 'A required parameter was not provided.';
          error = 'Missing Parameter';
          break;
        }
        case 'P2014':
        case 'P2015': {
          status = HttpStatus.BAD_REQUEST;
          message = 'This operation violates a required database relationship.';
          error = 'Relation Violation';
          break;
        }
        case 'P2021':
        case 'P2022': {
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database schema synchronization required. Please contact support or restart the service.';
          error = 'Database Schema Error';
          break;
        }
        case 'P2024': {
          status = HttpStatus.SERVICE_UNAVAILABLE;
          message = 'Database connection timed out. Please try again shortly.';
          error = 'Connection Timeout';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          const cause = (exception.meta?.cause as string) || '';
          message = cause || 'The requested record could not be found.';
          error = 'Not Found';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          const cause = (exception.meta?.cause as string);
          const lastLine = exception.message ? exception.message.split('\n').filter(Boolean).pop()?.trim() : '';
          const hint = cause || (lastLine && !lastLine.includes('invocation') ? lastLine : '');
          message = hint
            ? `Unable to complete request: ${hint}`
            : 'Unable to process request with the submitted data. Please review your entries and try again.';
          error = 'Database Request Error';
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`[${request.method} ${request.url}] Prisma Validation Error: ${exception.message}`);
      status = HttpStatus.BAD_REQUEST;
      const match = exception.message.match(/Argument `([^`]+)`.*|Unknown field `([^`]+)`/);
      const field = match ? (match[1] || match[2]) : null;
      message = field
        ? `Invalid or unexpected field "${field}" in request.`
        : 'Invalid data format provided for this request. Please check your entries.';
      error = 'Validation Error';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`[${request.method} ${request.url}] Prisma Initialization Error: ${exception.message}`);
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'The database service is currently unavailable. Please verify your connection.';
      error = 'Database Connection Error';
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${request.method} ${request.url}] Unhandled Exception: ${exception.message}`,
        exception.stack,
      );
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message || message;
      }
    }

    // Never let an unhandled error crash or return undefined
    response.status(status).json({
      statusCode: status,
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

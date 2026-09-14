import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './infrastructure/domain-exception.filter';

/** Shared by main.ts and the tests, so both run the same pipes and filters. */
export function setupApp<T extends INestApplication>(app: T): T {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableCors();
  return app;
}

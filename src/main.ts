import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = setupApp(await NestFactory.create(AppModule));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

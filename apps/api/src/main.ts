import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });
  app.use(cookieParser());

  const config = new DocumentBuilder()
    .setTitle('Unicorns Edu API')
    .setDescription('API backend cho Unicorns Edu 5.0')
    .setVersion('1.0')
    .addCookieAuth('access_token', {
      description: 'Access token for authentication',
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'cookie',
    })
    .addCookieAuth('refresh_token', {
      description: 'Refresh token for authentication',
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'cookie',
    })
    .build();
  const document = SwaggerModule.createDocument(
    app as Parameters<typeof SwaggerModule.createDocument>[0],
    config,
  );
  SwaggerModule.setup(
    'api',
    app as Parameters<typeof SwaggerModule.setup>[1],
    document,
  );

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();

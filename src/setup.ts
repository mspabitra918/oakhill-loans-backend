import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Applies the shared runtime configuration (validation, CORS, Swagger) to a
 * Nest application. Used by both the local HTTP bootstrap (src/main.ts) and the
 * Vercel serverless handler (api/index.ts) so they behave identically.
 */
export function configureApp(app: INestApplication): void {
  // Lock down request bodies: strip unknown props, reject extras, coerce types.
  // Without this the class-validator decorators on the DTOs are not enforced.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Allow the Next.js frontend to call the API from the browser.
  // In production, set FRONTEND_URL to the deployed frontend origin.
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Loan API')
    .setDescription('Loan Management API Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
}

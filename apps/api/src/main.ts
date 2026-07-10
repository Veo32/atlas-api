import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression = require('compression');
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  const origin = config.get<string>('APP_URL') ?? 'http://localhost:3000';
  const allowedOrigins = [origin, 'https://bakrr.net', 'https://www.bakrr.net'].filter(Boolean);

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin || allowedOrigins.includes(requestOrigin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  });
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cookieParser(config.get<string>('COOKIE_SECRET')));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const docConfig = new DocumentBuilder()
    .setTitle('AI Tools Directory API')
    .setDescription('Public, developer, admin, billing, analytics, and moderation APIs.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, docConfig));

  await app.listen(config.get<number>('PORT') ?? 4000);
}

bootstrap();

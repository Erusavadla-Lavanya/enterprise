import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  
  // Database connection verification test on startup
  const prisma = app.get(PrismaService);
  try {
    await prisma.$connect();
    console.log('✅ Database connection test successful!');
  } catch (err: any) {
    console.error('❌ Database connection test failed on startup:', err.message || err);
  }

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const configService: ConfigService = app.get(ConfigService);

  // 默认为启用
  const enable = configService.get<boolean>('swagger.enable', true);

  // 判断是否需要启用
  if (!enable) {
    return;
  }

  // 配置Swagger文档
  const options = new DocumentBuilder()
    // .addBearerAuth() // 开启 BearerAuth 授权认证
    .setTitle(configService.get<string>('swagger.title'))
    .setDescription('相关 API 接口文档')
    .setVersion('1.0')
    .setLicense('MIT', 'https://github.com/kuizuo/kz-nest-admin')
    .build();
  const document = SwaggerModule.createDocument(app, options, {
    // include: [ApiModule],
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup(configService.get<string>('swagger.path', 'swagger-ui'), app, document);
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PageOptionsDto } from '@/common/dto/page.dto';

export class PageSearchLoginLogDto extends PageOptionsDto {
  @ApiProperty({ description: '用户名' })
  @IsOptional()
  @IsString()
  username: string;

  @ApiProperty({ description: '登录IP' })
  @IsString()
  @IsOptional()
  ip: string;

  @ApiProperty({ description: '登录地点' })
  @IsString()
  @IsOptional()
  address: string;

  @ApiProperty({ description: '登录时间' })
  @IsOptional()
  time: string[];
}

export class PageSearchTaskLogDto extends PageOptionsDto {
  @ApiProperty({ description: '用户名' })
  @IsOptional()
  @IsString()
  username: string;

  @ApiProperty({ description: '登录IP' })
  @IsString()
  @IsOptional()
  ip: string;

  @ApiProperty({ description: '登录时间' })
  @IsOptional()
  time: string[];
}

import { PickType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateDeviceDto } from './create-device.dto';

export class StockAccessoryInputDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  quantity: number;
}

export class CreateStockDto extends PickType(CreateDeviceDto, [
  'name', 'device_categories_id', 'specifications', 'brand', 'model',
  'location', 'image_url',
] as const) {
  @IsOptional()
  @IsUUID()
  device_model_id?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  quantity: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => StockAccessoryInputDto)
  accessory_stocks?: StockAccessoryInputDto[];
}

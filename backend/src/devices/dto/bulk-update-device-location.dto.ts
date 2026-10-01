import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class BulkUpdateDeviceLocationDto {
  @IsUUID()
  device_model_id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  device_ids: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;
}

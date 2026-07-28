import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceCategoryDto } from './create-device-category.dto';

export class UpdateDeviceCategoryDto extends PartialType(CreateDeviceCategoryDto) {}

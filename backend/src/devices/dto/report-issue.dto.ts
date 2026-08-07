import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReportIssueDto {
  @IsString({ message: 'Mô tả lỗi phải là chuỗi' })
  @IsNotEmpty({ message: 'Vui lòng nhập mô tả lỗi thiết bị' })
  issue: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

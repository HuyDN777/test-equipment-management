import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');
    if (!file.mimetype.startsWith('image/')) throw new BadRequestException('Chỉ chấp nhận file ảnh');
    return this.upload(file, { folder: 'test_equipment_management', resource_type: 'image' });
  }

  async uploadAvatar(file: Express.Multer.File | undefined, userId: string) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh đại diện');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Ảnh đại diện phải là JPG, PNG hoặc WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Ảnh đại diện không được vượt quá 5 MB');
    }
    return this.upload(file, {
      folder: 'test_equipment_management/avatars',
      resource_type: 'image',
      public_id: userId,
      overwrite: true,
      invalidate: true,
    });
  }

  private async upload(file: Express.Multer.File, options: {
    folder: string;
    resource_type: 'image';
    public_id?: string;
    overwrite?: boolean;
    invalidate?: boolean;
  }) {
    if (!this.config.get('CLOUDINARY_CLOUD_NAME') || !this.config.get('CLOUDINARY_API_KEY') || !this.config.get('CLOUDINARY_API_SECRET')) {
      throw new ServiceUnavailableException('Cloudinary chưa được cấu hình');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, uploaded) => error || !uploaded ? reject(error) : resolve(uploaded),
      );
      stream.end(file.buffer);
    });

    return { url: result.secure_url, public_id: result.public_id };
  }
}

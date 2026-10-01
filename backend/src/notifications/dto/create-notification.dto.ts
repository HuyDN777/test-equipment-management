import { NotificationType } from '../entities/notification.entity';

export class CreateNotificationDto {
  user_id: string;
  title: string;
  message: string;
  type?: NotificationType;
  payload?: Record<string, unknown> | null;
}

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'devportal_secret_key',
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findAuthUserById(payload.sub);
    if (!user || payload.tokenVersion !== user.token_version) {
      throw new UnauthorizedException('Token đã bị thu hồi');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

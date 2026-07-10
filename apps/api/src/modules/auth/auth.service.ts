import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async register(input: { email: string; password: string; name?: string; locale?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (existing) throw new BadRequestException('Email already exists');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: { email: input.email.toLowerCase(), passwordHash, name: input.name, locale: input.locale ?? 'en' }
    });
    return this.issueTokens(user.id, user.email, user.roles);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueTokens(user.id, user.email, user.roles);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET')
      });
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });
      return this.issueTokens(user.id, user.email, user.roles);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(sub: string, email: string, roles: string[]) {
    const accessToken = await this.jwt.signAsync(
      { sub, email, roles },
      { secret: this.config.get<string>('JWT_ACCESS_SECRET'), expiresIn: '15m' }
    );
    const refreshToken = await this.jwt.signAsync(
      { sub },
      { secret: this.config.get<string>('JWT_REFRESH_SECRET'), expiresIn: '30d' }
    );
    return { accessToken, refreshToken, user: { id: sub, email, roles } };
  }
}

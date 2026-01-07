import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { skip?: number; take?: number; branchId?: number }) {
    const { skip = 0, take = 50, branchId } = params || {};
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          branch: true,
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: users,
      total,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
    };
  }

  async create(data: any) {
    const existing = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existing) {
      throw new ConflictException('Username already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        username: data.username,
        fullName: data.fullName,
        passwordHash,
        branchId: data.branchId || 1, // Default branch
        active: true,
      },
    });
  }

  async update(id: number, data: any) {
    if (data.password) {
      data.passwordHash = await bcrypt.hash(data.password, 10);
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { active: false },
    });
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDemoDto: CreateDemoDto) {
    const { userName, email, files, advanceId } = createDemoDto;

    if (files) {
      files.forEach((file) => {
        if (!file.title || !file.src) {
          throw new ConflictException('File must have title and src.');
        }
      });
    }

    // Create the demo entry
    const demo = await this.prisma.demo.create({
      data: {
        userName,
        email,
        files: files
          ? {
              create: files.map((file) => ({
                title: file.title,
                src: file.src,
                srcHash: crypto
                  .createHash('md5')
                  .update(file.src)
                  .digest('hex'), // Hashing the src
              })),
            }
          : undefined,
        advance: {
          connect: { id: advanceId },
        },
      },
    });

    const updatedAdvance = await this.prisma.advance.update({
      where: { id: advanceId },
      data: {
        demo: {
          connect: { id: demo.id }, // Connect the newly created demo to the advance
        },
      },
    });

    return { message: 'Demo created successfully', demo, updatedAdvance };
  }

  async findAll() {
    return this.prisma.demo.findMany({
      include: {
        files: true,
        advance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const demo = await this.prisma.demo.findUnique({
      where: { id },
      include: {
        files: true,
        advance: true,
      },
    });

    if (!demo) {
      throw new NotFoundException('Demo not found');
    }

    return demo;
  }

  async update(id: string, updateDemoDto: UpdateDemoDto) {
    const demo = await this.prisma.demo.findUnique({
      where: { id },
    });

    if (!demo) {
      throw new NotFoundException('Demo not found');
    }

    // Prepare data for the update
    const updateData: Prisma.DemoUpdateInput = {
      userName: updateDemoDto.userName,
      email: updateDemoDto.email,
      status: updateDemoDto.status,
      advance: updateDemoDto.advanceId
        ? {
            connect: { id: updateDemoDto.advanceId },
          }
        : undefined,
    };

    // Handle photos update separately
    if (updateDemoDto.files) {
      // Assuming you want to replace all photos, not just add or remove specific ones
      updateData.files = {
        create: updateDemoDto.files.map((file) => ({
          src: file.src,
          title: file.title,
        })),
      };
    }

    const updatedDemo = await this.prisma.demo.update({
      where: { id },
      data: updateData,
    });

    return { message: 'Demo updated successfully', updatedDemo };
  }

  async remove(id: string) {
    const demo = await this.prisma.demo.findUnique({
      where: { id },
    });

    if (!demo) {
      throw new NotFoundException('Demo not found');
    }

    await this.prisma.demo.delete({
      where: { id },
    });

    return { message: 'Demo deleted successfully' };
  }
}

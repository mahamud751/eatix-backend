import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { UpdateBlogCommentDto } from './dto/update-blog-comment.dto';

@Injectable()
export class BlogCommentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createBlogCommentDto: CreateBlogCommentDto) {
    const { userName, email, comment, blogId } = createBlogCommentDto;

    // Check if the blog exists
    const blog = await this.prisma.blog.findUnique({
      where: { id: blogId },
    });

    if (!blog) {
      throw new NotFoundException('Blog not found');
    }

    // Create the blog comment
    const blogComment = await this.prisma.blogComment.create({
      data: {
        userName,
        email,
        comment,
        blog: {
          connect: { id: blogId },
        },
      },
    });

    return { message: 'Blog comment created successfully', blogComment };
  }

  async findAll() {
    return this.prisma.blogComment.findMany({
      include: { blog: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const blogComment = await this.prisma.blogComment.findUnique({
      where: { id },
      include: { blog: true },
    });

    if (!blogComment) {
      throw new NotFoundException('Blog comment not found');
    }

    return blogComment;
  }

  async update(id: string, updateBlogCommentDto: UpdateBlogCommentDto) {
    const blogComment = await this.prisma.blogComment.findUnique({
      where: { id },
    });

    if (!blogComment) {
      throw new NotFoundException('Blog comment not found');
    }

    const updatedBlogComment = await this.prisma.blogComment.update({
      where: { id },
      data: updateBlogCommentDto,
    });

    return {
      message: 'Blog comment updated successfully',
      updatedBlogComment,
    };
  }

  async remove(id: string) {
    const blogComment = await this.prisma.blogComment.findUnique({
      where: { id },
    });

    if (!blogComment) {
      throw new NotFoundException('Blog comment not found');
    }

    await this.prisma.blogComment.delete({
      where: { id },
    });

    return { message: 'Blog comment deleted successfully' };
  }
}

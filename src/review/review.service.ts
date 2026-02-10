import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(data: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const photoObjects =
      data.photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || [];

    const review = await this.prisma.review.create({
      data: {
        userName: data.userName,
        comment: data.comment,
        rating: data.rating,
        photos: photoObjects,
        product: { connect: { id: data.productId } },
      },
    });

    return review;
  }

  async getAllReviews(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;

    const skip = (pageNumber - 1) * perPageNumber;

    const totalCountPromise = this.prisma.review.count();

    const dataPromise = this.prisma.review.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    return { data, total };
  }

  async getReviewsByUser(userName: string) {
    const reviews = await this.prisma.review.findMany({
      where: { userName },
    });

    if (!reviews.length) {
      throw new NotFoundException('No reviews found for the specified user.');
    }

    return reviews;
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  async replyToReview(reviewId: string, body: string, userName: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        replies: {
          push: { body, replyUser: userName },
        },
      },
    });
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.review.delete({
      where: { id: reviewId },
    });
  }

  async updateReview(reviewId: string, data: UpdateReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const photoObjects =
      data.photos?.map((photo) => ({
        title: photo.title,
        src: photo.src,
      })) || review.photos;

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        userName: data.userName || review.userName,
        comment: data.comment || review.comment,
        rating: data.rating || review.rating,
        status: data.status || review.status,
        photos: photoObjects,
      },
    });
  }
}

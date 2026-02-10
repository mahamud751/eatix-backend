/* eslint-disable prettier/prettier */
import * as nodemailer from 'nodemailer';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationService } from 'src/notification/notification.service';
import { UpdateOrderDto } from './dto/update-order.dto';
import { AuditLogService } from 'src/audit/audit.service';
import { NotificationGateway } from 'src/notification/notification.gateway';
import { UpdateSubOrderDto } from 'src/subOrder/dto/sub-order-update-dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto) {
    const { getState, ...orderData } = createOrderDto;

    // Create the main order
    const order = await this.prisma.order.create({
      data: {
        ...orderData,
        getState, // Store cart items in getState for reference
      },
    });

    // Create sub-orders for each product in getState

    console.log(orderData);
    const subOrders = [];

    const lastSubOrder = await this.prisma.subOrder.findFirst({
      orderBy: { orderSerial: 'desc' },
      select: { orderSerial: true },
    });
    let nextOrderSerial = lastSubOrder ? lastSubOrder.orderSerial + 1 : 102;
    // const receivedTk =
    //   (orderData.grandPrice * (orderData.percentOfPayment / 100)).toFixed(0) ||
    //   0;

    if (getState && Array.isArray(getState)) {
      getState.forEach((item) => {
        // Check if item.product.id already exists in subOrders
        // console.log(item);

        const existingSubOrderIndex = subOrders.findIndex(
          (subOrder) => subOrder.productId === item.product.id,
        );

        // console.log({ totalAmount });
        const productEntry = {
          product: {
            id: item.product.id,
            configId: item?.product?.configId || '',
            name: item?.name || '',
            price: item.product.price || 0,
            fulldesc: '',
          },
          quantity: item.quantity || 1,
          attributes: item?.attributes || {},
          adjustment: 0,

          discount: 0,
          selectedImage: item?.selectedImage || '',
          vendor_id: item.seller.id || '',
          vendor_name: item.seller.name || '',
        };

        if (existingSubOrderIndex === -1) {
          // No existing subOrder, push a new one
          subOrders.push({
            orderId: order.id,
            productId: item.product.id,
            products: [productEntry],
            receivedTk: Number(
              (item.totalAmount * (orderData.percentOfPayment / 100)).toFixed(
                0,
              ) || 0,
            ),
            status: item.status || 'Pending',
            percentOfPayment: orderData.percentOfPayment || 0,
            totalAmount: item.totalAmount || 0,
            orderSerial: nextOrderSerial,
          });
          nextOrderSerial++;
        } else {
          // Existing subOrder found, append to its products array
          subOrders[existingSubOrderIndex].products.push(productEntry);
          // Update top-level quantity and totalAmount
          subOrders[existingSubOrderIndex].quantity += item.quantity || 1;
          subOrders[existingSubOrderIndex].totalAmount =
            subOrders[existingSubOrderIndex].price *
            subOrders[existingSubOrderIndex].quantity;
        }
      });

      await this.prisma.subOrder.createMany({
        data: subOrders,
      });
    }

    // Create notification
    const notification = await this.notificationService.createNotification({
      userEmail: order.email,
      orderId: order.id,
      message: `Your order has been placed successfully.`,
    });

    this.notificationGateway.emitNotification(notification);

    // Send email
    await this.sendOrderEmail(createOrderDto.email);

    return order;
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
    email?: string,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = perPage ? Number(perPage) : null;
    const skip = (pageNumber - 1) * (perPageNumber || 0);

    const totalCountPromise = this.prisma.order.count();

    const where: any = {};

    const dataPromise = this.prisma.order.findMany({
      skip: perPageNumber ? skip : undefined,
      take: perPageNumber || undefined,
      where,
      orderBy: { createdAt: 'desc' },
    });

    const [total, data] = await Promise.all([totalCountPromise, dataPromise]);

    let filteredData = data;

    if (email) {
      filteredData = data
        .map((order) => {
          const filteredState = order.getState.filter((stateItem: any) => {
            const userInfo = stateItem.product.userInfo;
            return userInfo?.email ? userInfo.email.includes(email) : false;
          });

          if (filteredState.length > 0) {
            return {
              ...order,
              getState: filteredState,
            };
          }
          return null;
        })
        .filter((order) => order !== null);
    }

    const filteredTotal = email ? filteredData.length : total;

    return { data: filteredData, total: filteredTotal };
  }

  async findOrdersByEmail(
    email: string,
    page: number = 1,
    perPage: number = 10,
    // allOrder: boolean = false,
  ): Promise<any> {
    const pageNumber = Math.max(Number(page) || 1, 1);
    const perPageNumber = Math.max(Number(perPage) || 10, 1);
    const skip = (pageNumber - 1) * perPageNumber;

    const where: any = {
      order: email
        ? {
            email: {
              contains: email,
              mode: 'insensitive',
            },
          }
        : undefined,
    };

    const ordersPromise = this.prisma.subOrder.findMany({
      where, // Apply where clause to subOrder
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            grandPrice: true,
          },
        },
      },
    });

    const totalCountPromise = this.prisma.subOrder.count({ where });

    const [total, orders] = await Promise.all([
      totalCountPromise,
      ordersPromise,
    ]);

    // Optionally update orders older than 60 minutes (uncomment if needed)
    /*
  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
  await this.prisma.order.updateMany({
    where: {
      email: email ? { contains: email, mode: 'insensitive' } : undefined,
      createdAt: { lt: sixtyMinutesAgo },
    },
    data: { isDeleted: true },
  });
  */

    // if (allOrder) {
    //   const products = orders.flatMap((order) => order.products || []);
    //   return { data: products, total: products.length };
    // }

    return { data: orders, total };
  }

  async getOrderById(id: string) {
    return await this.prisma.order.findUnique({
      where: { id: id },
    });
  }

  async updateOrder(id: string, updateData: UpdateSubOrderDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orderId, ...subOrderData } = updateData;
    const oldOrder = await this.prisma.subOrder.findUnique({
      where: { id },
    });
    console.log(oldOrder);
    // if (!oldOrder) {
    //   throw new NotFoundException('Order not found');
    // }

    const updatedOrder = await this.prisma.subOrder.update({
      where: { id: id },
      data: { ...subOrderData },
    });

    // if (updateData.status) {
    //   await this.notificationService.createNotification({
    //     userEmail: updatedOrder.order.email,
    //     orderId: updatedOrder.id,
    //     message: `Your order status has been updated to ${updateData.status}.`,
    //   });
    // }

    await this.auditLogService.log(
      id,
      'Order',
      'UPDATE',
      oldOrder,
      updatedOrder,
    );

    return { message: 'Order updated successfully', updatedOrder };
  }

  async assignRiderToOrder(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { rider: true },
    });
    if (!order) {
      throw new NotFoundException('Order product not found');
    }
    if (updateOrderDto.riderIds) {
      await this.prisma.order.update({
        where: { id },
        data: {
          riderIds: {
            set: updateOrderDto.riderIds,
          },
        },
      });
    }
    return { message: 'Order rider assignment updated successfully' };
  }

  // async calculateTotalGrandPrice() {
  //   const orders = await this.prisma.order.findMany();
  //   const totalGrandPrice = orders.reduce(
  //     (total, order) => total + parseFloat(order.grandPrice),
  //     0,
  //   );
  //   return {
  //     data: {
  //       totalGrandPrice,
  //     },
  //   };
  // }

  async sendOrderEmail(email: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'mahamudoffice2@gmail.com',
        pass: 'dfvjjdrdquchrevg',
      },
    });

    const mailOptions = {
      from: 'mahamudoffice2@gmail.com',
      to: `mahamudoffice2@gmail.com,${email}`,
      subject: 'D Smart Uniform Solution',
      html: '<h1>Welcome</h1><p>Thanks For Order!</p>',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log('Email sent: ' + info.response);
      }
    });
  }
}

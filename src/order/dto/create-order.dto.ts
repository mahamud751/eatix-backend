import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsArray,
  IsDate,
} from 'class-validator';
import { Gender, CancelStatus } from '@prisma/client';

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'State of the order',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  getState?: any[];

  @ApiPropertyOptional({
    description: 'Total price of the order',
    example: '1500',
  })
  @IsOptional()
  @IsNumber()
  grandPrice?: number;

  // @ApiPropertyOptional({
  //   description: 'Selected size for the product',
  //   example: 'M',
  // })
  // @IsOptional()
  // @IsString()
  // selectedSize?: string;

  @ApiPropertyOptional({
    description: 'Total discount of the order',
    example: 1500.0,
  })
  @IsOptional()
  @IsNumber()
  discount?: number;

  // @ApiPropertyOptional({
  //   description: 'Selected color for the product',
  //   example: 'Red',
  // })
  // @IsOptional()
  // @IsString()
  // selectedColor?: string;

  @ApiPropertyOptional({
    description: "Customer's first name",
    example: 'John',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'User ID associated with the order',
    example: 'uuid',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Customer email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+880123456789',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'City for delivery',
    example: 'Dhaka',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: "Customer's address",
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: "Customer's street address",
    example: '123 Main St',
  })
  @IsOptional()
  @IsString()
  streetAddress?: string;

  @ApiPropertyOptional({
    description: 'Country of the customer',
    example: 'Bangladesh',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'District of the customer',
    example: 'Dhaka',
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({
    description: 'Postal code for delivery',
    example: '1212',
  })
  @IsOptional()
  @IsString()
  postCode?: string;

  @ApiPropertyOptional({
    description: "Customer's gender",
    enum: Gender,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Payment method used',
    example: 'bkash',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Payment number (e.g., Bkash number)',
    example: '+8801XXXXXXXXX',
  })
  @IsOptional()
  @IsString()
  paymentNumber?: string;

  @ApiPropertyOptional({
    description: 'Bkash number used for payment',
    example: '+8801XXXXXXXXX',
  })
  @IsOptional()
  @IsString()
  bkashNumber?: string;

  @ApiPropertyOptional({
    description: 'Status of the order',
    example: 'Pending',
    default: 'Pending',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Acceptable of the order',
    example: 'Pending',
    default: 'Pending',
  })
  @IsOptional()
  @IsString()
  acceptableStatus?: string;

  @ApiPropertyOptional({
    description: 'Total amount of the order',
    example: 1500.0,
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Amount received for the order',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  receivedTk?: number;

  @ApiPropertyOptional({
    description: 'Amount received for the order',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  percentOfPayment?: number;

  @ApiPropertyOptional({
    description: 'Amount due for the order',
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  dueAmount?: number;

  @ApiPropertyOptional({
    description: 'Total received amount',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  totalReceiveTk?: number;

  @ApiPropertyOptional({
    description: 'Payment status (e.g., paid, unpaid)',
    example: 'paid',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Is the order canceled',
    enum: CancelStatus,
    default: CancelStatus.NO,
  })
  @IsOptional()
  @IsEnum(CancelStatus)
  isCancel?: CancelStatus;

  @ApiPropertyOptional({
    description: 'List of rider IDs associated with the order',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riderIds?: string[];

  @ApiPropertyOptional({
    description: 'Discount code applied to the order',
    example: 'SAVE10',
  })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({
    description: 'Total amount paid for the order',
    example: 1500.0,
  })
  @IsOptional()
  @IsNumber()
  totalPaidAmount?: number;

  @ApiPropertyOptional({
    description: 'Adjustment for the order',
    example: 0.0,
  })
  @IsOptional()
  @IsNumber()
  adjustment?: number;

  @ApiPropertyOptional({
    description: 'Adjustment amount for the order',
    example: 0.0,
  })
  @IsOptional()
  @IsNumber()
  totalAdjustmentAmount?: number;

  @ApiPropertyOptional({
    description: 'Cost of local delivery in China',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber()
  chinaLocalDelivery?: number;

  @ApiPropertyOptional({
    description: 'Due amount for the product',
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  productDueAmount?: number;

  @ApiPropertyOptional({
    description: 'Total due for this order',
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  totalDueAmount?: number;

  @ApiPropertyOptional({
    description: 'Company-assigned order number',
    example: 'ORD12345',
  })
  @IsOptional()
  @IsString()
  companyOrderNumber?: string;

  @ApiPropertyOptional({
    description: 'Company tracking number for the order',
    example: 'TRK98765',
  })
  @IsOptional()
  @IsString()
  companyTrackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Total shipping weight of the order (in KG)',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  totalShippingWeight?: number;

  @ApiPropertyOptional({
    description: 'Shipping cost per kilogram',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  shippingPerKG?: number;

  @ApiPropertyOptional({
    description: 'Total shipping cost for the order',
    example: 250.0,
  })
  @IsOptional()
  @IsNumber()
  totalAmountForShipping?: number;

  @ApiPropertyOptional({
    description: 'Category of the product',
    example: 'Electronics',
  })
  @IsOptional()
  @IsString()
  productCategory?: string;

  @ApiPropertyOptional({
    description: 'Additional notes for the order',
    example: 'Deliver after 5 PM',
  })
  @IsOptional()
  @IsString()
  orderNote?: string;

  @ApiPropertyOptional({
    description: 'Product cost in Chinese Yuan (RMB)',
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  productRMB?: number;

  @ApiPropertyOptional({
    description: 'Exchange rate for RMB to local currency',
    example: 7.5,
  })
  @IsOptional()
  @IsNumber()
  productRMBRate?: number;

  @ApiPropertyOptional({
    description: 'Percentage fee for the purchase agent',
    example: 5.0,
  })
  @IsOptional()
  @IsNumber()
  purchaseAgentPercentage?: number;

  @ApiPropertyOptional({
    description: 'Company-reported shipping weight (in KG)',
    example: 2.7,
  })
  @IsOptional()
  @IsNumber()
  companyShippingWeight?: number;

  @ApiPropertyOptional({
    description: 'Company shipping cost per kilogram',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  companyShippingPerKG?: number;

  @ApiPropertyOptional({
    description: 'Company buying price',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  alibaBuyingPrice?: number;

  @ApiPropertyOptional({
    description: 'Company total shipping cost',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  alibaShippingCostTotal?: number;

  @ApiPropertyOptional({
    description: 'Company sale profit',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  alibaSaleProfit?: number;

  @ApiPropertyOptional({
    description: 'Company shipping profit',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  alibaShippingProfit?: number;

  @ApiPropertyOptional({
    description: 'Company net profit',
    example: 110.0,
  })
  @IsOptional()
  @IsNumber()
  alibaNetProfit?: number;

  @ApiPropertyOptional({
    description: 'Total profit for the order',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  Profit?: number;

  @ApiPropertyOptional({
    description: 'Total loss for the order',
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  Losss?: number;

  @ApiPropertyOptional({
    description: 'Approved date of the order',
    example: '2025-05-13T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  approvedDate?: Date;
  @ApiPropertyOptional({
    description: 'Default Value False',
    example: false,
  })
  @IsOptional()
  amountAdjustment?: string;

  @IsOptional()
  isDeleted?: boolean;
}

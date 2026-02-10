import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDate,
  IsArray,
} from 'class-validator';

export class CreateSubOrderDto {
  @ApiPropertyOptional({
    description: 'Product ID associated with the sub-order',
    example: 'uuid',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Unique order serial number',
    example: 102,
  })
  @IsOptional()
  @IsNumber()
  orderSerial?: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'State of the order',
    type: [Object],
  })
  @IsArray()
  @IsOptional()
  products?: any[];

  @ApiPropertyOptional({
    description: 'Acceptable status of the sub-order',
    example: 'Pending',
    default: 'Pending',
  })
  @IsOptional()
  @IsString()
  acceptableStatus?: string;

  @ApiPropertyOptional({
    description: 'Amount received for the sub-order',
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
    description: 'Total received amount for the sub-order',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  totalReceiveTk?: number;

  @ApiPropertyOptional({
    description: 'Payment status of the sub-order',
    example: 'paid',
  })
  @IsOptional()
  @IsString()
  paymentStatus?: string;

  @ApiPropertyOptional({
    description: 'Total amount of the sub-order',
    example: 1500.0,
  })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: 'Price per unit of the sub-order',
    example: 500.0,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    description: 'Quantity of items in the sub-order',
    example: 2.0,
  })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Discount applied to the sub-order',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({
    description: 'Discount code applied to the sub-order',
    example: 'SAVE10',
  })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({
    description: 'Total amount paid for the sub-order',
    example: 1400.0,
  })
  @IsOptional()
  @IsNumber()
  totalPaidAmount?: number;

  @ApiPropertyOptional({
    description: 'Adjustment for the sub-order',
    example: 0.0,
  })
  @IsOptional()
  @IsNumber()
  adjustment?: number;

  @ApiPropertyOptional({
    description: 'Total adjustment amount for the sub-order',
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
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  productDueAmount?: number;

  @ApiPropertyOptional({
    description: 'Total due amount for the sub-order example: 100.0',
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
    description: 'Company tracking number for the sub-order',
    example: 'TRK98765',
  })
  @IsOptional()
  @IsString()
  companyTrackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Total shipping weight of the sub-order (in KG)',
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
    description: 'Total shipping cost for the sub-order',
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
    description: 'Additional notes for the sub-order',
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
    example: 900.0,
  })
  @IsOptional()
  @IsNumber()
  alibaBuyingPrice?: number;

  @ApiPropertyOptional({
    description: 'Company total shipping cost',
    example: 297.0,
  })
  @IsOptional()
  @IsNumber()
  alibaShippingCostTotal?: number;

  @ApiPropertyOptional({
    description: 'Company sale profit',
    example: 200.0,
  })
  @IsOptional()
  @IsNumber()
  alibaSaleProfit?: number;

  @ApiPropertyOptional({
    description: 'Company shipping profit',
    example: 50.0,
  })
  @IsOptional()
  @IsNumber()
  alibaShippingProfit?: number;

  @ApiPropertyOptional({
    description: 'Company net profit',
    example: 250.0,
  })
  @IsOptional()
  @IsNumber()
  alibaNetProfit?: number;

  @ApiPropertyOptional({
    description: 'Total profit for the sub-order',
    example: 250.0,
  })
  @IsOptional()
  @IsNumber()
  Profit?: number;

  @ApiPropertyOptional({
    description: 'Total loss for the sub-order',
    example: 0.0,
  })
  @IsOptional()
  @IsNumber()
  Losss?: number;

  @ApiPropertyOptional({
    description: 'Approved date of the sub-order',
    example: '2025-05-28T00:00:00.000Z',
  })
  @IsOptional()
  @IsDate()
  approvedDate?: Date;

  @ApiPropertyOptional({
    description: 'Whether the sub-order is deleted',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'Amount adjustment for the sub-order',
    example: '0',
  })
  @IsOptional()
  @IsString()
  amountAdjustment?: string;

  @ApiPropertyOptional({
    description: 'Status of the sub-order',
    example: 'Pending',
    default: 'Pending',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

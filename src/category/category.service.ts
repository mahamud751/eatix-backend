import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuditLogService } from 'src/audit/audit.service';
import { FilterProductDto } from './dto/fIlter-product.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Agent } from 'https';

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return char;
    }
  });
}

@Injectable()
export class CategoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private httpService: HttpService,
  ) {}

  async getCategoriesFromOtapi() {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b'; // Your key
    const language = 'en'; // Adjust as needed
    const timestamp = Math.floor(Date.now() / 1000).toString(); // Current UNIX timestamp
    const signature = 'YOUR_SIGNATURE_LOGIC_HERE'; // Replace with your signature generation logic

    const url = `http://otapi.net/service-json/GetBriefCatalog?instanceKey=${instanceKey}&language=${language}&signature=${signature}&timestamp=${timestamp}`; // Fixed typo: ×tamp -> &timestamp

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.ErrorCode !== 'Ok') {
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }

      // Return the full raw data instead of mapping
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch OTAPI categories: ${error.message}`);
    }
  }

  async getBrandsFromOtapi() {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b'; // Your key
    const language = 'en'; // Adjust as needed
    const timestamp = Math.floor(Date.now() / 1000).toString(); // Current UNIX timestamp
    const signature = 'YOUR_SIGNATURE_LOGIC_HERE'; // Replace with your signature generation logic

    const url = `http://otapi.net/service-json/GetBrandInfoList?instanceKey=${instanceKey}&language=${language}&signature=${signature}&timestamp=${timestamp}`; // Fixed typo: ×tamp -> &timestamp

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (data.ErrorCode !== 'Ok') {
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }

      // Return the full raw data instead of mapping
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch OTAPI brands: ${error.message}`);
    }
  }

  async getTrendingItemsFromOtapi() {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b';
    const secret = process.env.OTAPI_SECRET || 'YOUR_SECRET_KEY';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${instanceKey}${timestamp}`)
      .digest('hex');

    // Fix frame size to 16, start at position 0
    const framePosition = 0;
    const frameSize = 16;

    // Define a list of trending search terms to rotate
    const trendingTerms = ['Bag', 'Shoe', 'Dress', 'Watch'];
    // Rotate based on current minute for simplicity (changes every minute)
    const minute = new Date().getMinutes();
    const selectedTerm = trendingTerms[minute % trendingTerms.length];
    const escapedTerm = escapeXml(selectedTerm);

    // Construct XML parameters for OTAPI search
    const xmlParameters = `<SearchItemsParameters><ItemTitle>${escapedTerm}</ItemTitle><StuffStatus>New</StuffStatus></SearchItemsParameters>`;
    const encodedXmlParameters = encodeURIComponent(xmlParameters);

    const url = `https://otapi.net/service-json/SearchItemsFrame?instanceKey=${instanceKey}&language=en&signature=${signature}&timestamp=${timestamp}&xmlParameters=${encodedXmlParameters}&framePosition=${framePosition}&frameSize=${frameSize}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          httpsAgent: new Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }),
      );
      const data = response.data;
      console.log('OTAPI Trending Items Response:', data);

      if (data.ErrorCode !== 'Ok') {
        if (
          data.ErrorCode === 'NotFound' ||
          !data.Result?.Items?.Content?.length
        ) {
          throw new NotFoundException(
            `No trending items found for search term: ${selectedTerm}`,
          );
        }
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }

      // Check if the content is empty
      if (!data.Result?.Items?.Content?.length) {
        throw new NotFoundException(
          `No trending items found for search term: ${selectedTerm}`,
        );
      }

      return {
        products: data.Result.Items.Content,
        searchTerm: selectedTerm, // Return the current search term for frontend display
      };
    } catch (error) {
      console.error(
        'OTAPI Trending Request Error:',
        error.response?.data || error.message,
      );
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException for proper HTTP 404 handling
      }
      throw new Error(`Failed to fetch OTAPI trending items: ${error.message}`);
    }
  }

  async getCategoryProductsFromOtapi(
    categoryId: number,
    page: number = 1, // Default to 1
    perPage: number = 36, // Default to 36
  ) {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b';
    const secret = process.env.OTAPI_SECRET || 'YOUR_SECRET_KEY';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${instanceKey}${timestamp}`)
      .digest('hex');

    // Ensure page and perPage are valid numbers, with defaults
    const safePage = Math.max(1, Number(page) || 1); // Minimum 1
    const safePerPage = Math.max(1, Number(perPage) || 36); // Minimum 1, default 36

    const framePosition = (safePage - 1) * safePerPage;
    const frameSize = safePerPage;
    const categoryIdFormatted = `otc-${categoryId}`;

    const url = `https://otapi.net/service-json/GetCategoryItemSimpleInfoListFrame?instanceKey=${instanceKey}&language=en&signature=${signature}&timestamp=${timestamp}&categoryId=${categoryIdFormatted}&framePosition=${framePosition}&frameSize=${frameSize}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          httpsAgent: new Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }),
      );
      const data = response.data;
      console.log('OTAPI Response:', data);

      if (data.ErrorCode !== 'Ok') {
        if (
          data.ErrorCode === 'NotFound' ||
          !data.OtapiItemInfoSubList?.Content?.length
        ) {
          throw new NotFoundException(
            `No products found for category ID ${categoryId}`,
          );
        }
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }

      // Check if the content is empty
      if (!data.OtapiItemInfoSubList?.Content?.length) {
        throw new NotFoundException(
          `No products found for category ID ${categoryId}`,
        );
      }

      return {
        products: data.OtapiItemInfoSubList.Content,
        totalCount: data.OtapiItemInfoSubList.TotalCount || 0,
        totalPages: Math.ceil(
          (data.OtapiItemInfoSubList.TotalCount || 0) / safePerPage,
        ),
        currentPage: safePage,
      };
    } catch (error) {
      console.error(
        'OTAPI Request Error:',
        error.response?.data || error.message,
      );
      if (error instanceof NotFoundException) {
        throw error; // Re-throw NotFoundException for proper HTTP 404 handling
      }
      throw new Error(`Failed to fetch OTAPI products: ${error.message}`);
    }
  }

  async searchItemsFromOtapi(
    searchKey: string,
    page: number,
    perPage: number,
    imageUrl?: string,
  ) {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b';
    const secret = process.env.OTAPI_SECRET || 'YOUR_SECRET_KEY';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${instanceKey}${timestamp}`)
      .digest('hex');

    const safePage = Math.max(1, Number(page) || 1);
    const safePerPage = Math.max(1, Number(perPage) || 36);

    const framePosition = (safePage - 1) * safePerPage;
    const frameSize = safePerPage;

    let xmlParameters = '<SearchItemsParameters>';
    if (searchKey) {
      xmlParameters += `<ItemTitle>${searchKey}</ItemTitle>`;
    }
    if (imageUrl) {
      xmlParameters += `<ImageUrl>${imageUrl}</ImageUrl>`; // Raw URL
    }
    xmlParameters += '</SearchItemsParameters>';

    const encodedXmlParameters = encodeURIComponent(xmlParameters); // Encode once here

    const url = `https://otapi.net/service-json/SearchItemsFrame?instanceKey=${instanceKey}&language=en&signature=${signature}&timestamp=${timestamp}&xmlParameters=${encodedXmlParameters}&framePosition=${framePosition}&frameSize=${frameSize}`; // Fixed '×tamp' typo

    console.log('OTAPI Request URL:', url);
    console.log('XML Parameters:', xmlParameters);

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          httpsAgent: new Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }),
      );
      const data = response.data;
      console.log('OTAPI Response:', JSON.stringify(data, null, 2));

      if (data.ErrorCode && data.ErrorCode !== 'Ok') {
        throw new Error(
          `OTAPI Error: ${data.ErrorCode} - ${data.ErrorDescription || 'No description'}`,
        );
      }

      return {
        products: data.Result?.Items?.Content || [],
        totalCount: data.Result?.Items?.TotalCount || 0,
        totalPages: Math.ceil(
          (data.Result?.Items?.TotalCount || 0) / safePerPage,
        ),
        currentPage: safePage,
        perPage: safePerPage,
      };
    } catch (error) {
      console.error(
        'OTAPI Search Error:',
        error.response?.data || error.message,
      );
      throw new Error(`Failed to fetch OTAPI search results: ${error.message}`);
    }
  }
  async getProductDetailsFromOtapi(itemId: string) {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b';
    const language = 'en';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = process.env.OTAPI_SECRET || 'YOUR_SECRET_KEY'; // Store in .env
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${instanceKey}${timestamp}`)
      .digest('hex');

    const url = `http://otapi.net/service-json/BatchGetItemFullInfo?instanceKey=${instanceKey}&language=${language}&signature=${signature}×tamp=${timestamp}&itemId=${itemId}&blockList=DeliveryCosts%2CPromotions%2CVendor%2CRootPath%2CProviderReviews%2CMostPopularVendorItems16%2CRecommendedItems%2CDescription%2COriginalDescription"`;

    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;
      console.log('OTAPI Product Response:', data);

      if (data.ErrorCode !== 'Ok') {
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }
      return data;
    } catch (error) {
      throw new Error(
        `Failed to fetch OTAPI product details: ${error.message}`,
      );
    }
  }

  async findAll(
    page: number = 1,
    perPage: number = 10,
  ): Promise<{ data: any[]; total: number }> {
    const pageNumber = Number(page) || 1;
    const perPageNumber = Number(perPage) || 10;
    const skip = (pageNumber - 1) * perPageNumber;

    // Fetch local categories from Prisma
    const totalCountPromise = this.prisma.category.count();
    const localDataPromise = this.prisma.category.findMany({
      skip,
      take: perPageNumber,
      orderBy: { createdAt: 'desc' },
      include: {
        subCategories: true,
        products: true,
      },
    });

    // Fetch OTAPI categories
    const otapiDataPromise = this.getCategoriesFromOtapi();

    // Combine results
    const [totalLocal, localData, otapiData] = await Promise.all([
      totalCountPromise,
      localDataPromise,
      otapiDataPromise,
    ]);

    // Merge local and OTAPI data
    const combinedData = [...localData, ...otapiData];

    // Apply pagination to combined data
    const paginatedData = combinedData.slice(skip, skip + perPageNumber);
    const total = totalLocal + otapiData.length; // Adjust total count

    return { data: paginatedData, total };
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { photos, ...rest } = createCategoryDto;

    // const photoObjects =
    //   photos?.map((photo) => ({
    //     title: photo.title,
    //     src: photo.src,
    //   })) || [];

    const category = await this.prisma.category.create({
      data: {
        ...rest,
      },
    });
    return { message: 'Category created successfully', category };
  }

  async findOne(id: string, subcategory?: string) {
    const includeSubcategory = subcategory ? true : false;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: includeSubcategory,
        products: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async getVendorProductsFromOtapi(
    vendorId: string,
    page: number = 1,
    perPage: number = 36,
  ) {
    const instanceKey = '7367999f-de6f-4e88-9d36-1642cff1746b';
    const secret = process.env.OTAPI_SECRET || 'YOUR_SECRET_KEY';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${instanceKey}${timestamp}`)
      .digest('hex');

    // Ensure page and perPage are valid numbers, with defaults
    const safePage = Math.max(1, Number(page) || 1); // Minimum 1
    const safePerPage = Math.max(1, Number(perPage) || 36); // Minimum 1, default 36

    const framePosition = (safePage - 1) * safePerPage;
    const frameSize = safePerPage;

    // Construct the XML parameters for OTAPI search with VendorId
    const xmlParameters = `<SearchItemsParameters><VendorId>${escapeXml(vendorId)}</VendorId><UseOptimalFrameSize>true</UseOptimalFrameSize></SearchItemsParameters>`;
    const encodedXmlParameters = encodeURIComponent(xmlParameters);

    const url = `https://otapi.net/service-json/SearchItemsFrame?instanceKey=${instanceKey}&language=en&signature=${signature}&timestamp=${timestamp}&xmlParameters=${encodedXmlParameters}&framePosition=${framePosition}&frameSize=${frameSize}`;

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, {
          httpsAgent: new Agent({
            rejectUnauthorized: process.env.NODE_ENV === 'production',
          }),
        }),
      );
      const data = response.data;
      console.log('OTAPI Vendor Products Response:', data);

      if (data.ErrorCode !== 'Ok') {
        throw new Error(`OTAPI Error: ${data.ErrorCode}`);
      }

      return {
        products: data.Result?.Items?.Content || [],
        totalCount: data.Result?.Items?.TotalCount || 0,
        totalPages: Math.ceil(
          (data.Result?.Items?.TotalCount || 0) / safePerPage,
        ),
        currentPage: safePage,
        perPage: safePerPage,
      };
    } catch (error) {
      console.error(
        'OTAPI Vendor Request Error:',
        error.response?.data || error.message,
      );
      throw new NotFoundException(
        `Failed to fetch OTAPI products for vendor ${vendorId}: ${error.message}`,
      );
    }
  }

  async findOneWithProducts(
    categoryId: string,
    filterProductDto: FilterProductDto,
  ) {
    const {
      page = 1,
      perPage = 10,
      priceRange,
      sizes,
      colors,
      sortPrice,
    } = filterProductDto;

    const skip = (page - 1) * perPage;

    const whereClause: any = {
      categoryId: categoryId,
      ...(priceRange && {
        price: {
          gte: priceRange[0],
          lte: priceRange[1],
        },
      }),
      ...(sizes && {
        sizes: {
          hasSome: sizes,
        },
      }),
      ...(colors && {
        colors: {
          hasSome: colors,
        },
      }),
    };

    const products = await this.prisma.product.findMany({
      where: whereClause,
      skip,
      take: perPage,
      orderBy: sortPrice ? { price: sortPrice } : undefined,
    });

    const totalProducts = await this.prisma.product.count({
      where: whereClause,
    });

    return {
      data: products,
      total: totalProducts,
      page,
      perPage,
      totalPages: Math.ceil(totalProducts / perPage),
    };
  }

  async findOneForUser(id: string, subcategory?: string) {
    const includeSubcategory = subcategory ? true : false;

    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: includeSubcategory,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }
    const { photos, subCategories, products, ...rest } = updateCategoryDto;

    const categoryUpdate = await this.prisma.category.update({
      where: { id },
      data: {
        ...rest,
      },
    });

    await this.auditLogService.log(
      id,
      'Category',
      'UPDATE',
      category,
      categoryUpdate,
    );

    return { message: 'Category updated successfully', categoryUpdate };
  }

  async remove(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.prisma.subCategory.deleteMany({
      where: { categoryId: id },
    });

    return this.prisma.category.delete({ where: { id } });
  }
}

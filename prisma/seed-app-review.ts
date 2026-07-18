/**
 * Idempotent App Store Review seed: demo customer + London restaurants with
 * menus, promos, and public ready shorts so nearby discovery is not empty.
 *
 * Usage:
 *   DATABASE_URL='postgresql://...' npm run seed:app-review
 *
 * Optional: place DATABASE_URL in eatix-backend/.env (loaded automatically).
 */
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { PrismaClient, ShortStatus, ShortVisibility } from '@prisma/client';

function loadEnvFiles() {
  const root = path.join(__dirname, '..');
  for (const file of ['.env', '.env.production', '.env.local']) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

loadEnvFiles();

/** Shared App Review password (uppercase + lowercase + number, ≥8 chars). */
export const DEMO_PASSWORD = 'EatwazeReview2026!';

const CUSTOMER_EMAIL = 'apple.review.customer@eatwaze.com';
const PRIMARY_OWNER_EMAIL = 'apple.review.owner@eatwaze.com';

/** Royalty-free food clips (Mixkit) — branded as restaurant shorts, not mock placeholders. */
const FOOD_VIDEOS = [
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-serving-a-plate-of-food-in-a-restaurant-2243-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=640&q=80',
    title: 'Tonight’s special',
    description: 'Fresh plates coming out of the kitchen — book a table or order in-app.',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-pasta-with-tomato-sauce-close-up-2298-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=640&q=80',
    title: 'Handmade pasta',
    description: 'Tomato sauce simmered all afternoon. Available for collection & delivery.',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-meal-in-a-restaurant-kitchen-4272-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=640&q=80',
    title: 'Behind the pass',
    description: 'A quick look at how we prep lunch service.',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-into-a-cup-2285-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=640&q=80',
    title: 'Morning brew',
    description: 'Espresso & brunch until 11:30. Open for walk-ins.',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-salad-preparation-close-up-2240-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80',
    title: 'Garden salad',
    description: 'Seasonal greens with house dressing.',
  },
  {
    url: 'https://assets.mixkit.co/videos/preview/mixkit-burger-with-fries-and-a-soft-drink-on-a-table-42294-large.mp4',
    thumb:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=640&q=80',
    title: 'Weekend burger',
    description: 'Double smash with fries — limited weekend promo.',
  },
];

type RestaurantSeed = {
  email: string;
  name: string;
  nickname: string;
  businessName: string;
  channelAbout: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  coverUrl: string;
  categories: { name: string; items: MenuItemSeed[] }[];
  promo: {
    title: string;
    description: string;
    promoCode: string;
    promoAmount: number;
  };
};

type MenuItemSeed = {
  itemName: string;
  description: string;
  price: number;
  dietaryType?: string;
  imageUrl?: string;
};

/** Clustered within ~15 km of central London (default nearby radius). */
const RESTAURANTS: RestaurantSeed[] = [
  {
    email: PRIMARY_OWNER_EMAIL,
    name: 'Covent Garden Kitchen',
    nickname: 'Covent Garden Kitchen',
    businessName: 'Covent Garden Kitchen',
    channelAbout:
      'Seasonal British plates in the heart of Covent Garden. Collection & delivery on Eatwaze.',
    address: '12 Floral Street, Covent Garden, London',
    postcode: 'WC2E 9DH',
    latitude: 51.5128,
    longitude: -0.124,
    photoUrl:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=640&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80',
    categories: [
      {
        name: 'Starters',
        items: [
          {
            itemName: 'Soup of the day',
            description: 'Chef’s seasonal soup with sourdough.',
            price: 6.5,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=640&q=80',
          },
          {
            itemName: 'Heritage tomato salad',
            description: 'Burrata, basil oil, aged balsamic.',
            price: 9.5,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80',
          },
        ],
      },
      {
        name: 'Mains',
        items: [
          {
            itemName: 'Roast chicken',
            description: 'Free-range half chicken, gravy, greens.',
            price: 16.5,
            dietaryType: 'non_veg',
            imageUrl:
              'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=640&q=80',
          },
          {
            itemName: 'Handmade tagliatelle',
            description: 'Slow tomato ragu, parmesan.',
            price: 14.0,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=640&q=80',
          },
        ],
      },
    ],
    promo: {
      title: '10% off first order',
      description: 'Welcome offer for App Review / new Eatwaze customers.',
      promoCode: 'EATWAZE10',
      promoAmount: 10,
    },
  },
  {
    email: 'apple.review.soho@eatwaze.com',
    name: 'Soho Spice House',
    nickname: 'Soho Spice House',
    businessName: 'Soho Spice House',
    channelAbout: 'Modern Indian sharing plates in Soho. Spice levels made to order.',
    address: '48 Broadwick Street, Soho, London',
    postcode: 'W1F 7AH',
    latitude: 51.5136,
    longitude: -0.131,
    photoUrl:
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=640&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=1200&q=80',
    categories: [
      {
        name: 'Curries',
        items: [
          {
            itemName: 'Butter chicken',
            description: 'Classic tomato-butter sauce, basmati rice.',
            price: 13.5,
            dietaryType: 'non_veg',
            imageUrl:
              'https://images.unsplash.com/photo-1603894584373-5ac1596c3a4b?w=640&q=80',
          },
          {
            itemName: 'Paneer tikka masala',
            description: 'Grilled paneer in spiced tomato gravy.',
            price: 12.0,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=640&q=80',
          },
        ],
      },
      {
        name: 'Breads',
        items: [
          {
            itemName: 'Garlic naan',
            description: 'Fresh from the tandoor.',
            price: 3.5,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=640&q=80',
          },
        ],
      },
    ],
    promo: {
      title: 'Free garlic naan',
      description: 'Add promo code at checkout on orders over £20.',
      promoCode: 'SOHONAAN',
      promoAmount: 5,
    },
  },
  {
    email: 'apple.review.borough@eatwaze.com',
    name: 'Borough Market Bites',
    nickname: 'Borough Market Bites',
    businessName: 'Borough Market Bites',
    channelAbout: 'Market-inspired small plates by London Bridge. Great for lunch.',
    address: '8 Southwark Street, London',
    postcode: 'SE1 1TL',
    latitude: 51.5055,
    longitude: -0.091,
    photoUrl:
      'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=640&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80',
    categories: [
      {
        name: 'Plates',
        items: [
          {
            itemName: 'Smoked salmon bagel',
            description: 'Cream cheese, dill, capers.',
            price: 8.5,
            dietaryType: 'non_veg',
            imageUrl:
              'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=640&q=80',
          },
          {
            itemName: 'Halloumi wrap',
            description: 'Grilled halloumi, salad, chilli jam.',
            price: 9.0,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=640&q=80',
          },
        ],
      },
    ],
    promo: {
      title: 'Lunch deal 15% off',
      description: 'Weekday lunch 11:30–14:30.',
      promoCode: 'BOROUGH15',
      promoAmount: 15,
    },
  },
  {
    email: 'apple.review.shoreditch@eatwaze.com',
    name: 'Shoreditch Street Kitchen',
    nickname: 'Shoreditch Street Kitchen',
    businessName: 'Shoreditch Street Kitchen',
    channelAbout: 'Burgers, bowls & late bites in Shoreditch.',
    address: '22 Rivington Street, London',
    postcode: 'EC2A 3DU',
    latitude: 51.5255,
    longitude: -0.078,
    photoUrl:
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=640&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80',
    categories: [
      {
        name: 'Burgers',
        items: [
          {
            itemName: 'Smash burger',
            description: 'Double patty, cheese, pickles, house sauce.',
            price: 11.5,
            dietaryType: 'non_veg',
            imageUrl:
              'https://images.unsplash.com/photo-1550547660-d9450f859349?w=640&q=80',
          },
          {
            itemName: 'Crispy tofu burger',
            description: 'Plant-based patty, slaw, vegan mayo.',
            price: 10.5,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=640&q=80',
          },
        ],
      },
    ],
    promo: {
      title: 'Weekend burger special',
      description: '10% off burgers Fri–Sun.',
      promoCode: 'SHOREDITCH10',
      promoAmount: 10,
    },
  },
  {
    email: 'apple.review.camden@eatwaze.com',
    name: 'Camden Comfort Kitchen',
    nickname: 'Camden Comfort Kitchen',
    businessName: 'Camden Comfort Kitchen',
    channelAbout: 'Comfort food near Camden Market — breakfast through dinner.',
    address: '5 Camden High Street, London',
    postcode: 'NW1 7JE',
    latitude: 51.539,
    longitude: -0.1426,
    photoUrl:
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=640&q=80',
    coverUrl:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    categories: [
      {
        name: 'Comfort',
        items: [
          {
            itemName: 'Mac & cheese',
            description: 'Three-cheese bake, crispy top.',
            price: 10.0,
            dietaryType: 'veg',
            imageUrl:
              'https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=640&q=80',
          },
          {
            itemName: 'Fish & chips',
            description: 'Beer-battered cod, mushy peas.',
            price: 14.5,
            dietaryType: 'non_veg',
            imageUrl:
              'https://images.unsplash.com/photo-1579208030886-b937da0925dc?w=640&q=80',
          },
        ],
      },
    ],
    promo: {
      title: 'Camden locals 12% off',
      description: 'Valid on collection orders.',
      promoCode: 'CAMDEN12',
      promoAmount: 12,
    },
  },
];

async function upsertUser(
  prisma: PrismaClient,
  opts: {
    email: string;
    passwordHash: string;
    role: string;
    name: string;
    nickname?: string;
    channelAbout?: string;
    address?: string;
    postcode?: string;
    latitude?: number;
    longitude?: number;
    businessName?: string;
    businessAddress?: string;
    photos?: object[];
    coverUrl?: string;
    deliveryTime?: string;
    contentAreaKm?: number;
    deliveryAreaKm?: number;
    pickupAreaKm?: number;
  },
) {
  const existing = await prisma.user.findUnique({ where: { email: opts.email } });
  const data = {
    name: opts.name,
    nickname: opts.nickname ?? opts.name,
    channelAbout: opts.channelAbout,
    password: opts.passwordHash,
    role: opts.role,
    status: 'active' as const,
    otpVerified: true,
    termsAccepted: true,
    profileComplete: true,
    address: opts.address,
    postcode: opts.postcode,
    latitude: opts.latitude,
    longitude: opts.longitude,
    businessName: opts.businessName,
    businessAddress: opts.businessAddress ?? opts.address,
    photos: opts.photos ?? [],
    coverUrl: opts.coverUrl,
    deliveryTime: opts.deliveryTime ?? '30–45 minutes',
    contentAreaKm: opts.contentAreaKm ?? 15,
    deliveryAreaKm: opts.deliveryAreaKm ?? 10,
    pickupAreaKm: opts.pickupAreaKm ?? 5,
    openingHours: [
      { day: 'Mon', open: '11:00', close: '22:00' },
      { day: 'Tue', open: '11:00', close: '22:00' },
      { day: 'Wed', open: '11:00', close: '22:00' },
      { day: 'Thu', open: '11:00', close: '22:00' },
      { day: 'Fri', open: '11:00', close: '23:00' },
      { day: 'Sat', open: '10:00', close: '23:00' },
      { day: 'Sun', open: '10:00', close: '21:00' },
    ],
  };

  if (existing) {
    return prisma.user.update({ where: { id: existing.id }, data });
  }
  return prisma.user.create({
    data: { email: opts.email, ...data },
  });
}

async function replaceOwnerContent(
  prisma: PrismaClient,
  userId: string,
  restaurant: RestaurantSeed,
) {
  await prisma.promotion.deleteMany({ where: { userId } });
  await prisma.menuItem.deleteMany({ where: { userId } });
  await prisma.menuCategory.deleteMany({ where: { userId } });
  await prisma.short.deleteMany({ where: { userId } });

  const menuItemIds: string[] = [];
  let sort = 0;
  for (const cat of restaurant.categories) {
    const category = await prisma.menuCategory.create({
      data: {
        userId,
        name: cat.name,
        sortOrder: sort++,
      },
    });
    let itemSort = 0;
    for (const item of cat.items) {
      const created = await prisma.menuItem.create({
        data: {
          userId,
          categoryId: category.id,
          itemName: item.itemName,
          description: item.description,
          price: item.price,
          dietaryType: item.dietaryType,
          imageUrl: item.imageUrl,
          sortOrder: itemSort++,
        },
      });
      menuItemIds.push(created.id);
    }
  }

  const now = new Date();
  const expire = new Date(now);
  expire.setFullYear(expire.getFullYear() + 1);

  await prisma.promotion.create({
    data: {
      userId,
      title: restaurant.promo.title,
      description: restaurant.promo.description,
      thumbnailUrl: restaurant.photoUrl,
      mediaType: 'image',
      promoAmount: restaurant.promo.promoAmount,
      promoCode: restaurant.promo.promoCode,
      offerType: 'order',
      fulfillmentScopes: ['collection', 'delivery'],
      startDate: now,
      expireDate: expire,
      menuItemIds,
    },
  });

  // Two shorts per restaurant from the shared pool (rotated by email hash).
  const offset =
    Math.abs(
      restaurant.email.split('').reduce((a, c) => a + c.charCodeAt(0), 0),
    ) % FOOD_VIDEOS.length;
  for (let i = 0; i < 2; i++) {
    const clip = FOOD_VIDEOS[(offset + i) % FOOD_VIDEOS.length];
    await prisma.short.create({
      data: {
        userId,
        title: clip.title,
        description: `${clip.description} — ${restaurant.businessName}`,
        videoUrl: clip.url,
        thumbnailUrl: clip.thumb,
        coverUrl: clip.thumb,
        duration: 15,
        durationLimit: '60',
        mimeType: 'video/mp4',
        visibility: ShortVisibility.public,
        status: ShortStatus.ready,
        publishedAt: now,
        category: 'food',
        tags: ['eatwaze', 'london', 'food', restaurant.postcode.split(' ')[0].toLowerCase()],
        viewCount: 40 + i * 12,
        likeCount: 5 + i,
      },
    });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Export it or add eatix-backend/.env before running seed:app-review.',
    );
  }

  const prisma = new PrismaClient();
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function runSeed(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // Customer: central London so nearby feed includes all seeded restaurants.
  const customer = await upsertUser(prisma, {
    email: CUSTOMER_EMAIL,
    passwordHash,
    role: 'user',
    name: 'App Review Customer',
    nickname: 'App Review Customer',
    channelAbout: 'Apple App Review demo customer account for Eatwaze.',
    address: '1 Trafalgar Square, London',
    postcode: 'WC2N 5DN',
    latitude: 51.5081,
    longitude: -0.1281,
    photos: [
      {
        src: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=320&q=80',
      },
    ],
  });

  const owners = [];
  for (const restaurant of RESTAURANTS) {
    const owner = await upsertUser(prisma, {
      email: restaurant.email,
      passwordHash,
      role: 'owner',
      name: restaurant.name,
      nickname: restaurant.nickname,
      channelAbout: restaurant.channelAbout,
      address: restaurant.address,
      postcode: restaurant.postcode,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      businessName: restaurant.businessName,
      businessAddress: restaurant.address,
      coverUrl: restaurant.coverUrl,
      photos: [{ src: restaurant.photoUrl }],
    });
    await replaceOwnerContent(prisma, owner.id, restaurant);
    owners.push(owner);
  }

  console.log('App Review seed complete.');
  console.log(
    JSON.stringify(
      {
        customer: { id: customer.id, email: CUSTOMER_EMAIL },
        primaryOwner: {
          id: owners[0]?.id,
          email: PRIMARY_OWNER_EMAIL,
        },
        restaurants: owners.map((o) => ({ id: o.id, email: o.email, name: o.name })),
        password: DEMO_PASSWORD,
        browseAs: {
          postcode: 'WC2N 5DN',
          lat: 51.5081,
          lng: -0.1281,
          note: 'Use customer account; nearby radius is 15 km around Trafalgar Square.',
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

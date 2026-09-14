import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

/** Connects lazily, on the first query. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        // adapter-pg sends DateTimes without an offset and Postgres reads them in the session's TimeZone,
        // so on a non-UTC server every stored instant would be shifted. Pin the session to UTC.
        options: '-c timezone=UTC',
      }),
    });
  }

  onModuleDestroy() {
    return this.$disconnect();
  }
}

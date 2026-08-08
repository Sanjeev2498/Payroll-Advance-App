import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';

describe('Prisma Models Test', () => {
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should have contract model available', () => {
    console.log('PrismaService:', prismaService);
    console.log('Contract model:', prismaService.contract);
    console.log('Available models:', Object.getOwnPropertyNames(Object.getPrototypeOf(prismaService)).filter(name => !name.startsWith('$')));
    
    expect(prismaService).toBeDefined();
    expect(prismaService.contract).toBeDefined();
  });

  it('should have attendance model available', () => {
    expect(prismaService.attendance).toBeDefined();
  });
});
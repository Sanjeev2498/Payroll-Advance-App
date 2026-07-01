import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionUtil } from '../utils/encryption.util';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [EncryptionUtil],
  exports: [EncryptionUtil],
})
export class EncryptionModule {}
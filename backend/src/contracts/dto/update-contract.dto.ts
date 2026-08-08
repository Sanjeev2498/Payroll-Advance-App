import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateContractDto } from './create-contract.dto';

export class UpdateContractDto extends PartialType(
  OmitType(CreateContractDto, ['clientId'] as const)
) {}
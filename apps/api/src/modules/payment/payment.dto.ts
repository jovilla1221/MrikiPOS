import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateQrisPaymentDto {
  @IsUUID()
  @IsNotEmpty()
  transaction_id!: string;
}

export class MockPayDto {
  @IsUUID()
  @IsNotEmpty()
  payment_id!: string;
}

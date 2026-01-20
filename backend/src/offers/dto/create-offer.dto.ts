import { IsInt, IsBoolean, IsPositive, IsOptional } from 'class-validator';

export class CreateOfferDto {
  @IsPositive()
  amount: number;

  @IsInt()
  @IsPositive()
  itemId: number;

  @IsBoolean()
  @IsOptional()
  hidden?: boolean;
}

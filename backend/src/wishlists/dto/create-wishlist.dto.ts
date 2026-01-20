import {
  IsString,
  IsUrl,
  IsArray,
  IsInt,
  Length,
  IsOptional,
} from 'class-validator';

export class CreateWishlistDto {
  @IsString()
  @Length(1, 250)
  name: string;

  @IsString()
  @Length(0, 1500)
  @IsOptional()
  description?: string;

  @IsUrl()
  image: string;

  @IsArray()
  @IsInt({ each: true })
  itemsId: number[];
}

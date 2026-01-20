import { IsString, IsUrl, IsNumber, Length, Min } from 'class-validator';

export class CreateWishDto {
  @IsString()
  @Length(1, 250)
  name: string;

  @IsString()
  link: string;

  @IsUrl()
  image: string;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsString()
  @Length(1, 1024)
  description: string;
}

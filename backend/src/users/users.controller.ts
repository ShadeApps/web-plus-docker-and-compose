import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FindUsersDto } from './dto/find-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WishesService } from '../wishes/wishes.service';
import { Wish } from '../wishes/entities/wish.entity';
import { Offer } from '../offers/entities/offer.entity';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly wishesService: WishesService,
  ) {}

  private sanitizeUser(user: User, { exposeEmail } = { exposeEmail: false }) {
    if (!user) {
      return user;
    }
    const { password, email, ...publicProfile } = user;
    void password;
    return exposeEmail ? { ...publicProfile, email } : publicProfile;
  }

  private sanitizeWish(wish: Wish) {
    if (!wish) {
      return wish;
    }
    const { owner, offers, ...rest } = wish;
    return {
      ...rest,
      price: Number(rest.price),
      raised: Number(rest.raised),
      owner: this.sanitizeUser(owner as User),
      offers:
        offers?.map((offer: Offer) => {
          const { user, ...offerRest } = offer;
          return {
            ...offerRest,
            amount: Number(offerRest.amount),
            user: this.sanitizeUser(user as User),
          };
        }) ?? [],
    };
  }

  private sanitizeWishes(wishes: Wish[]) {
    return wishes.map((wish) => this.sanitizeWish(wish));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findOwn(@Request() req) {
    const user = await this.usersService.findOne({
      where: { id: req.user.id },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user, { exposeEmail: true });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateOwn(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const updatedUser = await this.usersService.updateOne(
      { id: req.user.id },
      updateUserDto,
    );
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(updatedUser as User, { exposeEmail: true });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/wishes')
  async findOwnWishes(@Request() req) {
    const wishes = await this.wishesService.findMany({
      where: { owner: { id: req.user.id } },
      relations: ['owner', 'offers', 'offers.user'],
    });
    return this.sanitizeWishes(wishes);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username')
  async findPublic(@Param('username') username: string) {
    const user = await this.usersService.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user) as Omit<User, 'password' | 'email'>;
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/wishes')
  async findPublicWishes(@Param('username') username: string) {
    const user = await this.usersService.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const wishes = await this.wishesService.findMany({
      where: { owner: { id: user.id } },
      relations: ['owner', 'offers', 'offers.user'],
    });
    return this.sanitizeWishes(wishes);
  }

  @UseGuards(JwtAuthGuard)
  @Post('find')
  async findMany(@Body() { query }: FindUsersDto) {
    const users = await this.usersService.findMany(query);
    return users.map((user) =>
      this.sanitizeUser(user as User, { exposeEmail: true }),
    );
  }
}

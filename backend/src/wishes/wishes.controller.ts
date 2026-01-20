import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Wish } from './entities/wish.entity';
import { Offer } from '../offers/entities/offer.entity';
import { User } from '../users/entities/user.entity';

@Controller('wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  private sanitizeUser(user?: Partial<User>) {
    if (!user) {
      return user;
    }
    const { password, email, ...publicUser } = user;
    void password;
    void email;
    return publicUser;
  }

  private sanitizeOffer(offer: Offer) {
    if (!offer) {
      return offer;
    }
    const { user, ...rest } = offer;
    return {
      ...rest,
      amount: Number(rest.amount),
      user: this.sanitizeUser(user),
    };
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
      owner: this.sanitizeUser(owner),
      offers: offers?.map((offer) => this.sanitizeOffer(offer)) ?? [],
    };
  }

  private sanitizeWishes(wishes: Wish[]) {
    return wishes.map((wish) => this.sanitizeWish(wish));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createWishDto: CreateWishDto) {
    const wish = await this.wishesService.createForOwner(
      createWishDto,
      req.user.id,
    );
    const fullWish = await this.wishesService.findOne({
      where: { id: wish.id },
      relations: ['owner'],
    });
    return this.sanitizeWish(fullWish ?? wish);
  }

  @Get('last')
  async findLast() {
    const wishes = await this.wishesService.findLast();
    return this.sanitizeWishes(wishes);
  }

  @Get('top')
  async findTop() {
    const wishes = await this.wishesService.findTop();
    return this.sanitizeWishes(wishes);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const wish = await this.wishesService.findOne({
      where: { id },
      relations: ['owner', 'offers', 'offers.user'],
    });
    if (!wish) {
      throw new NotFoundException('Wish not found');
    }
    return this.sanitizeWish(wish);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateWishDto: UpdateWishDto,
  ) {
    const wish = await this.wishesService.updateWithChecks(
      id,
      updateWishDto,
      req.user.id,
    );
    return this.sanitizeWish(wish);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const wish = await this.wishesService.removeWithChecks(id, req.user.id);
    return this.sanitizeWish(wish);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/copy')
  async copy(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const wish = await this.wishesService.copyWish(id, req.user.id);
    return this.sanitizeWish(wish);
  }
}

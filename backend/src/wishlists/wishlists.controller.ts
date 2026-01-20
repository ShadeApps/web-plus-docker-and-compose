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
import { WishlistsService } from './wishlists.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Wishlist } from './entities/wishlist.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { User } from '../users/entities/user.entity';

@Controller('wishlistlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  private sanitizeUser(user?: Partial<User>) {
    if (!user) {
      return user;
    }
    const { password, email, ...publicUser } = user;
    void password;
    void email;
    return publicUser;
  }

  private sanitizeWish(wish: Wish) {
    if (!wish) {
      return wish;
    }
    const { owner, offers, ...rest } = wish;
    void offers;
    return {
      ...rest,
      price: Number(rest.price),
      raised: Number(rest.raised),
      owner: this.sanitizeUser(owner),
    };
  }

  private sanitizeWishlist(wishlist: Wishlist) {
    if (!wishlist) {
      return wishlist;
    }
    const { owner, items, ...rest } = wishlist;
    return {
      ...rest,
      owner: this.sanitizeUser(owner),
      items: items?.map((item) => this.sanitizeWish(item)) ?? [],
    };
  }

  private sanitizeWishlists(wishlists: Wishlist[]) {
    return wishlists.map((wishlist) => this.sanitizeWishlist(wishlist));
  }

  @Get()
  async findAll() {
    const wishlists = await this.wishlistsService.findMany({
      relations: ['owner', 'items', 'items.owner'],
    });
    return this.sanitizeWishlists(wishlists);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const wishlist = await this.wishlistsService.findOne({
      where: { id },
      relations: ['owner', 'items', 'items.owner'],
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }
    return this.sanitizeWishlist(wishlist);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createWishlistDto: CreateWishlistDto) {
    const wishlist = await this.wishlistsService.createForOwner(
      createWishlistDto,
      req.user.id,
    );
    const fullWishlist = await this.wishlistsService.findOne({
      where: { id: wishlist.id },
      relations: ['owner', 'items', 'items.owner'],
    });
    return this.sanitizeWishlist(fullWishlist ?? wishlist);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateWishlistDto: UpdateWishlistDto,
  ) {
    const wishlist = await this.wishlistsService.updateWithChecks(
      id,
      updateWishlistDto,
      req.user.id,
    );
    return this.sanitizeWishlist(wishlist);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const wishlist = await this.wishlistsService.removeWithChecks(
      id,
      req.user.id,
    );
    return this.sanitizeWishlist(wishlist);
  }
}

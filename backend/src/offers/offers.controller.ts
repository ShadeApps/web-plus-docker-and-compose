import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Offer } from './entities/offer.entity';
import { Wish } from '../wishes/entities/wish.entity';
import { User } from '../users/entities/user.entity';

@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  private sanitizeUser(user?: Partial<User>) {
    if (!user) {
      return user;
    }
    const { password, email, ...publicUser } = user;
    void password;
    void email;
    return publicUser;
  }

  private sanitizeWish(wish?: Wish) {
    if (!wish) {
      return wish;
    }
    const { owner, ...rest } = wish as Wish & {
      offers?: Offer[];
    };
    return {
      ...rest,
      price: Number(rest.price),
      raised: Number(rest.raised),
      owner: this.sanitizeUser(owner),
    };
  }

  private sanitizeOffer(offer: Offer, currentUserId?: number | null) {
    if (!offer) {
      return offer;
    }
    const { user, item, ...rest } = offer;
    const donorId = user?.id ?? null;
    const ownerId = item?.owner?.id ?? null;
    const shouldHide =
      offer.hidden && currentUserId !== donorId && currentUserId !== ownerId;
    return {
      ...rest,
      amount: shouldHide ? null : Number(rest.amount),
      user: shouldHide ? null : this.sanitizeUser(user),
      item: this.sanitizeWish(item),
    };
  }

  private sanitizeOffers(offers: Offer[], currentUserId?: number | null) {
    return offers.map((offer) => this.sanitizeOffer(offer, currentUserId));
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createOfferDto: CreateOfferDto) {
    const offer = await this.offersService.createForUser(
      createOfferDto,
      req.user,
    );
    return this.sanitizeOffer(offer, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    const offers = await this.offersService.findMany({
      relations: ['user', 'item', 'item.owner'],
    });
    return this.sanitizeOffers(offers, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const offer = await this.offersService.findOne({
      where: { id },
      relations: ['user', 'item', 'item.owner'],
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    return this.sanitizeOffer(offer, req.user?.id);
  }
}

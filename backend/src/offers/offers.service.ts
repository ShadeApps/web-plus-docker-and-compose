import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
} from 'typeorm';
import { Offer } from './entities/offer.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { Wish } from '../wishes/entities/wish.entity';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(Offer)
    private offersRepository: Repository<Offer>,
    @InjectRepository(Wish)
    private wishesRepository: Repository<Wish>,
    private readonly mailService: MailService,
  ) {}

  async create(createOfferDto: CreateOfferDto): Promise<Offer> {
    const offer = this.offersRepository.create(createOfferDto);
    return await this.offersRepository.save(offer);
  }

  async findOne(query: FindOneOptions<Offer>): Promise<Offer> {
    return await this.offersRepository.findOne(query);
  }

  async findMany(query: FindManyOptions<Offer>): Promise<Offer[]> {
    return await this.offersRepository.find(query);
  }

  async updateOne(
    where: FindOptionsWhere<Offer>,
    updateOfferDto: Partial<Offer>,
  ): Promise<Offer> {
    await this.offersRepository.update(where, updateOfferDto);
    return await this.findOne({ where });
  }

  async removeOne(where: FindOptionsWhere<Offer>): Promise<Offer> {
    const offer = await this.findOne({ where });
    if (!offer) {
      return offer;
    }
    await this.offersRepository.delete(where);
    return offer;
  }

  async createForUser(
    createOfferDto: CreateOfferDto,
    user: { id: number; email?: string; username?: string },
  ): Promise<Offer> {
    const wish = await this.wishesRepository.findOne({
      where: { id: createOfferDto.itemId },
      relations: ['owner'],
    });
    if (!wish) {
      throw new NotFoundException('Wish not found');
    }
    if (wish.owner?.id === user.id) {
      throw new BadRequestException('You cannot contribute to your own wish');
    }

    const amount = Number(createOfferDto.amount);
    const raised = Number(wish.raised);
    const price = Number(wish.price);
    if (raised + amount > price) {
      throw new BadRequestException('Contribution exceeds remaining amount');
    }

    const payload = {
      ...createOfferDto,
      user: { id: user.id } as User,
      item: wish,
    } as CreateOfferDto & { user: User; item: Wish };

    const offer = await this.create(payload);
    wish.raised = raised + amount;
    await this.wishesRepository.save(wish);

    await this.mailService.sendOfferNotification({
      wishTitle: wish.name,
      ownerEmail: wish.owner?.email,
      donorEmail: user.email,
      amount,
      hidden: Boolean(createOfferDto.hidden),
    });

    return await this.findOne({
      where: { id: offer.id },
      relations: ['user', 'item', 'item.owner'],
    });
  }
}

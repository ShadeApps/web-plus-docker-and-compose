import {
  BadRequestException,
  ForbiddenException,
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
import { Wish } from './entities/wish.entity';
import { CreateWishDto } from './dto/create-wish.dto';
import { UpdateWishDto } from './dto/update-wish.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WishesService {
  constructor(
    @InjectRepository(Wish)
    private wishesRepository: Repository<Wish>,
  ) {}

  async create(createWishDto: CreateWishDto): Promise<Wish> {
    const wish = this.wishesRepository.create(createWishDto);
    return await this.wishesRepository.save(wish);
  }

  async findOne(query: FindOneOptions<Wish>): Promise<Wish> {
    return await this.wishesRepository.findOne(query);
  }

  async findMany(query: FindManyOptions<Wish>): Promise<Wish[]> {
    return await this.wishesRepository.find(query);
  }

  async updateOne(
    where: FindOptionsWhere<Wish>,
    updateWishDto: UpdateWishDto,
  ): Promise<Wish> {
    await this.wishesRepository.update(where, updateWishDto);
    return await this.findOne({ where });
  }

  async removeOne(where: FindOptionsWhere<Wish>): Promise<Wish> {
    const wish = await this.findOne({ where });
    if (!wish) {
      return wish;
    }
    await this.wishesRepository.delete(where);
    return wish;
  }

  async createForOwner(
    createWishDto: CreateWishDto,
    ownerId: number,
  ): Promise<Wish> {
    const payload = {
      ...createWishDto,
      owner: { id: ownerId } as User,
    } as CreateWishDto & { owner: User };
    return await this.create(payload);
  }

  private async findWishWithOwner(id: number): Promise<Wish> {
    return await this.wishesRepository.findOne({
      where: { id },
      relations: ['owner', 'offers'],
    });
  }

  async updateWithChecks(
    id: number,
    updateWishDto: UpdateWishDto,
    userId: number,
  ): Promise<Wish> {
    const wish = await this.findWishWithOwner(id);
    if (!wish) {
      throw new NotFoundException('Wish not found');
    }
    if (wish.owner.id !== userId) {
      throw new ForbiddenException('You can only update your own wishes');
    }
    if (updateWishDto.price !== undefined) {
      const hasContributors = (wish.offers?.length ?? 0) > 0;
      const currentPrice = Number(wish.price);
      if (hasContributors && Number(updateWishDto.price) !== currentPrice) {
        throw new BadRequestException(
          'Cannot change price after contributions',
        );
      }
    }

    await this.updateOne({ id }, updateWishDto);
    return await this.findOne({
      where: { id },
      relations: ['owner', 'offers', 'offers.user'],
    });
  }

  async removeWithChecks(id: number, userId: number): Promise<Wish> {
    const wish = await this.findWishWithOwner(id);
    if (!wish) {
      throw new NotFoundException('Wish not found');
    }
    if (wish.owner.id !== userId) {
      throw new ForbiddenException('You can only remove your own wishes');
    }

    await this.removeOne({ id });
    return wish;
  }

  async findLast(limit = 40): Promise<Wish[]> {
    return await this.findMany({
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['owner'],
    });
  }

  async findTop(limit = 20): Promise<Wish[]> {
    return await this.findMany({
      order: { copied: 'DESC' },
      take: limit,
      relations: ['owner'],
    });
  }

  async copyWish(id: number, ownerId: number): Promise<Wish> {
    const wish = await this.wishesRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!wish) {
      throw new NotFoundException('Wish not found');
    }

    await this.wishesRepository.update({ id }, { copied: wish.copied + 1 });

    const newWishPayload = {
      name: wish.name,
      link: wish.link,
      image: wish.image,
      price: Number(wish.price),
      description: wish.description,
      owner: { id: ownerId } as User,
    } as CreateWishDto & { owner: User };

    const newWish = await this.create(newWishPayload);
    return await this.findOne({
      where: { id: newWish.id },
      relations: ['owner'],
    });
  }
}

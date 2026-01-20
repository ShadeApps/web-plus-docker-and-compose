import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
} from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { Wish } from '../wishes/entities/wish.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistsRepository: Repository<Wishlist>,
    @InjectRepository(Wish)
    private wishesRepository: Repository<Wish>,
  ) {}

  async create(createWishlistDto: CreateWishlistDto): Promise<Wishlist> {
    const wishlist = this.wishlistsRepository.create(createWishlistDto);
    return await this.wishlistsRepository.save(wishlist);
  }

  async findOne(query: FindOneOptions<Wishlist>): Promise<Wishlist> {
    return await this.wishlistsRepository.findOne(query);
  }

  async findMany(query: FindManyOptions<Wishlist>): Promise<Wishlist[]> {
    return await this.wishlistsRepository.find(query);
  }

  async updateOne(
    where: FindOptionsWhere<Wishlist>,
    updateWishlistDto: UpdateWishlistDto,
  ): Promise<Wishlist> {
    await this.wishlistsRepository.update(where, updateWishlistDto);
    return await this.findOne({ where });
  }

  async removeOne(where: FindOptionsWhere<Wishlist>): Promise<Wishlist> {
    const wishlist = await this.findOne({ where });
    if (!wishlist) {
      return wishlist;
    }
    await this.wishlistsRepository.delete(where);
    return wishlist;
  }

  private async resolveItems(itemsId?: number[]): Promise<Wish[]> {
    if (!itemsId?.length) {
      return [];
    }
    return await this.wishesRepository.find({ where: { id: In(itemsId) } });
  }

  async createForOwner(
    createWishlistDto: CreateWishlistDto,
    ownerId: number,
  ): Promise<Wishlist> {
    const { itemsId, ...rest } = createWishlistDto;
    const items = await this.resolveItems(itemsId);
    const payload = {
      ...rest,
      owner: { id: ownerId } as User,
      items,
    } as Omit<CreateWishlistDto, 'itemsId'> & { owner: User; items: Wish[] };
    return await this.create(payload as unknown as CreateWishlistDto);
  }

  async updateWithChecks(
    id: number,
    updateWishlistDto: UpdateWishlistDto,
    ownerId: number,
  ): Promise<Wishlist> {
    const wishlist = await this.wishlistsRepository.findOne({
      where: { id },
      relations: ['owner', 'items'],
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }
    if (wishlist.owner.id !== ownerId) {
      throw new ForbiddenException('You can only update your own wishlists');
    }

    const { itemsId, ...rest } = updateWishlistDto;

    if (Object.keys(rest).length) {
      await this.updateOne({ id }, rest);
    }

    if (itemsId !== undefined) {
      wishlist.items = await this.resolveItems(itemsId);
      await this.wishlistsRepository.save({
        ...wishlist,
        items: wishlist.items,
      });
    }

    return await this.findOne({ where: { id }, relations: ['owner', 'items'] });
  }

  async removeWithChecks(id: number, ownerId: number): Promise<Wishlist> {
    const wishlist = await this.wishlistsRepository.findOne({
      where: { id },
      relations: ['owner'],
    });
    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }
    if (wishlist.owner.id !== ownerId) {
      throw new ForbiddenException('You can only remove your own wishlists');
    }

    await this.removeOne({ id });
    return wishlist;
  }
}

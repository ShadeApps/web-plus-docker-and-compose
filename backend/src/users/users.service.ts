import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ILike,
} from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashService } from '../hash/hash.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly hashService: HashService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const data = { ...createUserDto };
    if (data.password) {
      data.password = await this.hashService.hash(data.password);
    }
    const user = this.usersRepository.create(data);
    return await this.usersRepository.save(user);
  }

  async findOne(query: FindOneOptions<User>): Promise<User> {
    return await this.usersRepository.findOne(query);
  }

  async findMany(query: FindManyOptions<User>): Promise<User[]>;
  async findMany(search: string): Promise<User[]>;
  async findMany(argument: FindManyOptions<User> | string): Promise<User[]> {
    if (typeof argument === 'string') {
      const search = argument.trim();
      if (!search) {
        return await this.usersRepository.find();
      }

      return await this.usersRepository.find({
        where: [
          { username: ILike(`%${search}%`) },
          { email: ILike(`%${search}%`) },
        ],
      });
    }

    return await this.usersRepository.find(argument);
  }

  async updateOne(
    where: FindOptionsWhere<User>,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const data = { ...updateUserDto };
    if (data.password) {
      data.password = await this.hashService.hash(data.password);
    }
    await this.usersRepository.update(where, data);
    return await this.findOne({ where });
  }

  async removeOne(where: FindOptionsWhere<User>): Promise<User> {
    const user = await this.findOne({ where });
    if (!user) {
      return user;
    }
    await this.usersRepository.delete(where);
    return user;
  }
}

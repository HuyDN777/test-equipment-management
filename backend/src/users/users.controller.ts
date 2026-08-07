import { Controller, Get, Post, Body, Put, Patch, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  updateMyProfilePut(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    if (req.user.role !== UserRole.Admin) {
      delete updateUserDto.role;
    }
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  @Patch('me')
  updateMyProfilePatch(@Request() req: any, @Body() updateUserDto: UpdateUserDto) {
    if (req.user.role !== UserRole.Admin) {
      delete updateUserDto.role;
    }
    return this.usersService.update(req.user.userId, updateUserDto);
  }

  @Post()
  @Roles(UserRole.Admin)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.Admin)
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(+page, +limit, search);
  }

  @Get(':id')
  @Roles(UserRole.Admin)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.Admin)
  updatePut(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id')
  @Roles(UserRole.Admin)
  updatePatch(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.Admin)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}



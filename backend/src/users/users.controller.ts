import { Controller, Get, Post, Body, Put, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { CloudinaryService } from '../uploads/cloudinary.service';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  getProfile(@Request() req: any) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  updateMyProfilePut(@Request() req: any, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(req.user.userId, dto);
  }

  @Patch('me')
  updateMyProfilePatch(@Request() req: any, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMyProfile(req.user.userId, dto);
  }

  @Put('me/password')
  changeMyPassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changeMyPassword(req.user.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async updateMyAvatar(@Request() req: any, @UploadedFile() file?: Express.Multer.File) {
    const uploaded = await this.cloudinaryService.uploadAvatar(file, req.user.userId);
    return this.usersService.updateMyAvatar(req.user.userId, uploaded.url);
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
  remove(@Param('id') id: string, @Request() req: any) {
    return this.usersService.remove(id, req.user.userId);
  }
}



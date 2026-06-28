import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
  Req,
  Headers,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
  ReactivateAccountDto,
} from './dto/forgot-password.dto';
import {
  SetPinDto,
  VerifyPinDto,
  SetFingerprintDto,
  UpdateRememberMeDto,
} from './dto/set-pin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SavedLastLocationDto } from './dto/saved-last-location.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { BlockUserDto } from './dto/user-safety.dto';
import Roles from '../auth/roles.decorator';
import RolesGuard from '../auth/roles.guard';
import { Product } from '@prisma/client';
import { AdminRoleGuard } from 'src/auth/AdminRoleGuard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { multerOptions } from '../../middleware/multer.config';

@ApiTags('users')
@Controller('users')
// @UseGuards(RolesGuard)
// @ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('upload-documents')
  @UseInterceptors(FilesInterceptor('documents', 10, multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user registration documents' })
  @ApiBody({
    description: 'Upload multiple documents (images/PDFs)',
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Documents uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async uploadDocuments(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    files: Array<{ filename: string; path: string; url: string }>;
  }> {
    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      path: file.path,
      url: `/uploads/${file.filename}`,
    }));

    return { files: uploadedFiles };
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.loginUser(loginUserDto);
  }

  @Post('refresh-session')
  @ApiOperation({
    summary:
      'Refresh auth token for a logged-in user (accepts expired JWT with valid signature)',
  })
  @ApiResponse({ status: 200, description: 'Session refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Invalid session.' })
  async refreshSession(@Headers('authorization') authorization?: string) {
    return this.usersService.refreshSession(authorization);
  }

  @Post('social-login')
  @ApiOperation({ summary: 'Login/register using Google or Facebook token' })
  @ApiResponse({ status: 200, description: 'Social login successful.' })
  @ApiResponse({ status: 400, description: 'Invalid provider token.' })
  async socialLogin(@Body() dto: SocialLoginDto) {
    return this.usersService.socialLogin(dto);
  }

  @Delete('me/account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Permanently delete the logged-in user account' })
  async deleteMyAccount(@Req() req: { user?: { id: string } }) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.deleteOwnAccount(req.user.id);
  }

  @Get('blocks/ids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user ids blocked by the current user' })
  async getBlockedUserIds(@Req() req: { user?: { id: string } }) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.getBlockedUserIds(req.user.id);
  }

  @Post('blocks')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Block an abusive user' })
  async blockUser(
    @Body() dto: BlockUserDto,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.blockUser(
      req.user.id,
      dto.blockedUserId,
      dto.reason,
    );
  }

  @Delete('blocks/:blockedUserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @Param('blockedUserId') blockedUserId: string,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.unblockUser(req.user.id, blockedUserId);
  }

  @Post('login/admin')
  @ApiOperation({ summary: 'Login a admin' })
  @ApiResponse({ status: 200, description: 'admin logged in successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async loginAdmin(@Body() loginUserDto: LoginUserDto) {
    return this.usersService.loginAdmin(loginUserDto);
  }

  @Patch('saved-last-location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save last selected location for app feed (lat, lng, addressText)' })
  @ApiResponse({ status: 200, description: 'Location saved.' })
  async updateSavedLastLocation(
    @Body() dto: SavedLastLocationDto,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }
    return this.usersService.updateSavedLastLocation(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  @Patch('password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
    return this.usersService.updatePassword(updatePasswordDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully.' })
  async getUsers(
    @Query('role') role?: string,
    @Query('email') email?: string,
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 10,
    @Query('getAll') getAll: boolean = false,
    @Query('search') search?: string,
  ) {
    return this.usersService.getUsers(
      role,
      email,
      page,
      perPage,
      getAll,
      search,
    );
  }

  @Get('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Get admin user by email' })
  @ApiResponse({
    status: 200,
    description: 'Admin user retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'Admin user not found.' })
  async getAdmin(@Query('email') email: string) {
    return this.usersService.getAdmin(email);
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendor users' })
  @ApiResponse({ status: 200, description: 'Vendors retrieved successfully.' })
  async getVendors() {
    return this.usersService.getVendors();
  }

  @Get('token')
  @ApiOperation({ summary: 'Get JWT token for a user' })
  @ApiResponse({ status: 200, description: 'Token generated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getJWT(@Query('email') email: string) {
    return this.usersService.getJWT(email);
  }

  @Get('channels/list')
  @ApiOperation({ summary: 'List channels (users with videos or shorts)' })
  @ApiResponse({ status: 200, description: 'Channels retrieved successfully.' })
  async getChannelsList(
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getChannelsList(limit || 20);
  }

  @Get('subscribed-feed')
  @ApiOperation({ summary: 'Get videos and shorts from subscribed channels (For You)' })
  @ApiResponse({ status: 200, description: 'Subscribed feed retrieved successfully.' })
  async getSubscribedFeed(
    @Query('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    return this.usersService.getSubscribedFeed(userId, page || 1, limit || 30);
  }

  @Get(':id/channel-profile')
  @ApiOperation({ summary: 'Get channel profile with stats (videos, shorts, total views, subscribers)' })
  @ApiResponse({ status: 200, description: 'Channel profile retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getChannelProfile(
    @Param('id') id: string,
    @Query('currentUserId') currentUserId?: string,
  ) {
    return this.usersService.getChannelProfile(id, currentUserId);
  }

  @Get(':id/channel-reviews')
  @ApiOperation({
    summary: 'List restaurant order reviews for a channel (owner)',
  })
  @ApiResponse({ status: 200, description: 'Paginated reviews for this channel.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getChannelOrderReviews(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getChannelOrderReviews(id, page, limit);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'List followers (subscribers) for a channel/user' })
  @ApiResponse({ status: 200, description: 'Followers retrieved successfully.' })
  async getChannelFollowers(
    @Param('id') id: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getChannelFollowers(
      id,
      currentUserId,
      page || 1,
      limit || 50,
    );
  }

  @Get(':id/delivery-area-users')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'List logged-in customers within the owner delivery area (owner only)',
  })
  @ApiResponse({ status: 200, description: 'Delivery area users retrieved.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getDeliveryAreaUsers(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Authentication required');
    }
    return this.usersService.getDeliveryAreaUsers(
      id,
      req.user.id,
      page || 1,
      limit || 50,
    );
  }

  @Post(':id/riders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a rider account for this restaurant (owner only)' })
  async createOwnerRider(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
    @Body() dto: import('./dto/create-rider.dto').CreateRiderDto,
  ) {
    if (!req.user?.id) throw new BadRequestException('Authentication required');
    return this.usersService.createOwnerRider(id, req.user.id, dto);
  }

  @Get(':id/riders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List riders for this restaurant (owner only)' })
  async listOwnerRiders(
    @Param('id') id: string,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) throw new BadRequestException('Authentication required');
    return this.usersService.listOwnerRiders(id, req.user.id);
  }

  @Get(':ownerId/riders/:riderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rider profile and assigned orders (owner only)' })
  async getOwnerRiderProfile(
    @Param('ownerId') ownerId: string,
    @Param('riderId') riderId: string,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) throw new BadRequestException('Authentication required');
    return this.usersService.getOwnerRiderProfile(ownerId, riderId, req.user.id);
  }

  @Post(':ownerId/riders/:riderId/upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload rider profile photo (owner only)' })
  async uploadOwnerRiderAvatar(
    @Param('ownerId') ownerId: string,
    @Param('riderId') riderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user?: { id: string } },
  ) {
    if (!req.user?.id) throw new BadRequestException('Authentication required');
    return this.usersService.uploadOwnerRiderAvatar(
      ownerId,
      riderId,
      req.user.id,
      file,
    );
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'List channels this user is following' })
  @ApiResponse({ status: 200, description: 'Following list retrieved successfully.' })
  async getChannelFollowing(
    @Param('id') id: string,
    @Query('currentUserId') currentUserId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getChannelFollowing(
      id,
      currentUserId,
      page || 1,
      limit || 50,
    );
  }

  @Post(':id/upload-avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiResponse({ status: 200, description: 'Avatar updated.' })
  @ApiResponse({ status: 400, description: 'File required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user?: { id: string } },
  ) {
    if (req.user?.id !== id) {
      throw new BadRequestException('You can only upload your own avatar');
    }
    return this.usersService.uploadAvatar(id, file);
  }

  @Post(':id/upload-cover')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload channel cover image' })
  @ApiResponse({ status: 200, description: 'Cover updated.' })
  @ApiResponse({ status: 400, description: 'File required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async uploadCover(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user?: { id: string } },
  ) {
    if (req.user?.id !== id) {
      throw new BadRequestException('You can only upload your own cover image');
    }
    return this.usersService.uploadCoverImage(id, file);
  }

  @Post('channel/subscribe')
  @ApiOperation({ summary: 'Subscribe to a channel' })
  @ApiResponse({ status: 201, description: 'Subscribed successfully.' })
  async subscribeToChannel(
    @Body('subscriberId') subscriberId: string,
    @Body('channelUserId') channelUserId: string,
  ) {
    return this.usersService.subscribeToChannel(subscriberId, channelUserId);
  }

  @Post('channel/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from a channel' })
  @ApiResponse({ status: 200, description: 'Unsubscribed successfully.' })
  async unsubscribeFromChannel(
    @Body('subscriberId') subscriberId: string,
    @Body('channelUserId') channelUserId: string,
  ) {
    return this.usersService.unsubscribeFromChannel(subscriberId, channelUserId);
  }

  @Get(':id/gallery')
  @ApiOperation({ summary: 'Get user gallery photos (viewerId optional for isLiked/isDisliked)' })
  @ApiResponse({ status: 200, description: 'Gallery photos list.' })
  async getGallery(
    @Param('id') id: string,
    @Query('viewerId') viewerId?: string,
  ) {
    return this.usersService.getGallery(id, viewerId);
  }

  @Post(':id/gallery/:photoId/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like on a gallery photo' })
  async toggleGalleryPhotoLike(
    @Param('id') channelUserId: string,
    @Param('photoId') photoId: string,
    @Body('userId') userId: string,
  ) {
    return this.usersService.toggleGalleryPhotoLike(channelUserId, photoId, userId);
  }

  @Post(':id/gallery/:photoId/dislike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle dislike on a gallery photo' })
  async toggleGalleryPhotoDislike(
    @Param('id') channelUserId: string,
    @Param('photoId') photoId: string,
    @Body('userId') userId: string,
  ) {
    return this.usersService.toggleGalleryPhotoDislike(
      channelUserId,
      photoId,
      userId,
    );
  }

  @Post(':id/gallery/:photoId/share')
  @ApiOperation({ summary: 'Record share on a gallery photo' })
  async recordGalleryPhotoShare(
    @Param('id') channelUserId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.usersService.recordGalleryPhotoShare(channelUserId, photoId);
  }

  @Get(':id/gallery/:photoId/comments')
  @ApiOperation({ summary: 'List comments on a gallery photo' })
  async getGalleryPhotoComments(
    @Param('id') channelUserId: string,
    @Param('photoId') photoId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getGalleryPhotoComments(
      channelUserId,
      photoId,
      page ? parseInt(page, 10) || 1 : 1,
      limit ? parseInt(limit, 10) || 20 : 20,
    );
  }

  @Post(':id/gallery/:photoId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment on a gallery photo' })
  async addGalleryPhotoComment(
    @Param('id') channelUserId: string,
    @Param('photoId') photoId: string,
    @Body('userId') userId: string,
    @Body('content') content: string,
  ) {
    return this.usersService.addGalleryPhotoComment(
      channelUserId,
      photoId,
      userId,
      content,
    );
  }

  @Delete('gallery-comment/:commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own gallery photo comment' })
  async deleteGalleryPhotoComment(
    @Param('commentId') commentId: string,
    @Req() req: { user?: { id: string } },
  ) {
    const uid = req.user?.id;
    if (!uid) throw new BadRequestException('Unauthorized');
    return this.usersService.deleteGalleryPhotoComment(commentId, uid);
  }

  @Post(':id/gallery/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['files'],
    },
  })
  @ApiOperation({ summary: 'Upload gallery photos (multiple images)' })
  @ApiResponse({ status: 201, description: 'Photos uploaded.' })
  async uploadGallery(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user?: { id: string } },
  ) {
    if (req.user?.id !== id) {
      throw new BadRequestException('You can only upload to your own gallery');
    }
    return this.usersService.uploadGallery(id, files);
  }

  @Delete(':id/gallery/:photoId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a gallery photo' })
  @ApiResponse({ status: 200, description: 'Photo deleted.' })
  async deleteGalleryPhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @Req() req: { user?: { id: string } },
  ) {
    if (req.user?.id !== id) {
      throw new BadRequestException('You can only delete your own gallery photos');
    }
    return this.usersService.deleteGalleryPhoto(id, photoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Patch('batch-update')
  @ApiOperation({ summary: 'Batch update multiple users' })
  async batchUpdateUsers(
    @Body() body: { ids: string[]; updateUserDto: UpdateUserDto },
  ) {
    const { ids, updateUserDto } = body;
    return this.usersService.batchUpdateUsers(ids, updateUserDto);
  }

  @Patch(':id/update-role')
  @UseGuards(JwtAuthGuard, AdminRoleGuard)
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'The user has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserRole(id, updateUserDto);
  }

  @Get(':userId/last-visit')
  async getLastVisitedProducts(
    @Param('userId') userId: string,
  ): Promise<Product[]> {
    return this.usersService.getLastVisitedProducts(userId);
  }

  @Put('admin/:id')
  @ApiOperation({ summary: 'Update admin user details' })
  @ApiResponse({ status: 200, description: 'Admin user updated successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserAdmin(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserAdmin(id, updateUserDto);
  }

  // Authentication & Security Endpoints
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset - sends OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP.' })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.usersService.verifyOtp(verifyOtpDto);
  }

  @Post('request-email-verification-otp')
  @ApiOperation({ summary: 'Request signup email verification OTP' })
  @ApiResponse({ status: 200, description: 'Verification OTP sent successfully.' })
  async requestEmailVerificationOtp(@Body() dto: ForgotPasswordDto) {
    return this.usersService.requestEmailVerificationOtp(dto.email);
  }

  @Post('verify-email-verification-otp')
  @ApiOperation({ summary: 'Verify signup email OTP and activate account' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  async verifyEmailVerificationOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.usersService.verifyEmailVerificationOtp(verifyOtpDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password after OTP verification' })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(resetPasswordDto);
  }

  @Post('reactivate-account')
  @ApiOperation({ summary: 'Reactivate blocked/deactive account after OTP verification' })
  @ApiResponse({ status: 200, description: 'Account reactivated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request.' })
  async reactivateAccount(@Body() reactivateDto: ReactivateAccountDto) {
    return this.usersService.reactivateAccount(reactivateDto);
  }

  @Post('set-pin')
  @ApiOperation({ summary: 'Set or update user PIN' })
  @ApiResponse({ status: 200, description: 'PIN set successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid PIN format.' })
  async setPin(@Body() setPinDto: SetPinDto) {
    return this.usersService.setPin(setPinDto);
  }

  @Post('verify-pin')
  @ApiOperation({ summary: 'Verify user PIN' })
  @ApiResponse({ status: 200, description: 'PIN verified successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid PIN.' })
  async verifyPin(@Body() verifyPinDto: VerifyPinDto) {
    return this.usersService.verifyPin(verifyPinDto);
  }

  @Post('set-fingerprint')
  @ApiOperation({ summary: 'Enable/disable fingerprint authentication' })
  @ApiResponse({ status: 200, description: 'Fingerprint setting updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async setFingerprint(@Body() setFingerprintDto: SetFingerprintDto) {
    return this.usersService.setFingerprint(setFingerprintDto);
  }

  @Post('update-remember-me')
  @ApiOperation({ summary: 'Update remember me preference' })
  @ApiResponse({ status: 200, description: 'Remember me preference updated.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateRememberMe(@Body() updateRememberMeDto: UpdateRememberMeDto) {
    return this.usersService.updateRememberMe(updateRememberMeDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async changePassword(@Body() changePasswordDto: ChangePasswordDto) {
    return this.usersService.changePassword(changePasswordDto);
  }
}

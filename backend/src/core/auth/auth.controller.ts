import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ChangePasswordDto, ResetPasswordDto, SetPinDto, VerifyPinDto, ForceChangePasswordDto } from './dto/auth.dto';
import { JwtGuard } from './guards/jwt.guard';
import { RolesGuard, Roles } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto.email, dto.password);
    return { success: true, ...result };
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return { success: true, data: user };
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async getProfile(@Req() req: any) {
    const profile = await this.authService.getProfile(req.user.sub);
    return { success: true, data: profile };
  }

  @Post('change-password')
  @UseGuards(JwtGuard)
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.sub, dto.current_password, dto.new_password);
    return { success: true, message: 'Password changed' };
  }

  @Post('force-change-password')
  @UseGuards(JwtGuard)
  async forceChangePassword(@Req() req: any, @Body() dto: ForceChangePasswordDto) {
    await this.authService.forceChangePassword(req.user.sub, dto.new_password, dto.confirm_password);
    return { success: true, message: 'Password updated' };
  }

  @Post('reset-password')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.employee_id, dto.new_password);
    return { success: true, message: 'Password reset' };
  }

  @Post('set-pin')
  @UseGuards(JwtGuard)
  async setPin(@Req() req: any, @Body() dto: SetPinDto) {
    await this.authService.setPin(req.user.sub, dto.pin);
    return { success: true, message: 'PIN set successfully' };
  }

  @Post('verify-pin')
  @UseGuards(JwtGuard)
  async verifyPin(@Req() req: any, @Body() dto: VerifyPinDto) {
    const result = await this.authService.verifyPin(req.user.sub, dto.pin);
    return { success: true, data: result };
  }

  @Get('pin-status')
  @UseGuards(JwtGuard)
  async getPinStatus(@Req() req: any) {
    const hasPin = await this.authService.hasPinSet(req.user.sub);
    return { success: true, data: { has_pin: hasPin } };
  }
}

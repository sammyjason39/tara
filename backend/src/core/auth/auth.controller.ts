import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

interface RequestWithUser extends Request {
  user?: any;
}

@Controller("v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);
    return {
      success: true,
      message: "Registration successful",
      data: user,
    };
  }

  @Post("login")
  async login(@Body() dto: LoginDto) {
    const data = await this.authService.login(dto);
    return {
      success: true,
      message: "Login successful",
      ...data,
    };
  }

  @Get("me")
  async getProfile(@Req() request: RequestWithUser) {
    // In a real implementation this would verify the token
    // For now we assume the frontend passes an Authorization header we decode
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing token");
    }

    const token = authHeader.split(" ")[1];
    const user = await this.authService.verifyAndGetProfile(token);

    return {
      success: true,
      data: user,
    };
  }
}

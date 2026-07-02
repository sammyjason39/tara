import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { PrismaService } from '../../../persistence/prisma.service';
import { CompanyBrandingService } from '../services/company-branding.service';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { createLogoMulterOptions } from '../services/company-logo-upload.config';

/**
 * Frontend-compatible REST routes (previously served by DemoModule).
 * Maps the paths expected by the React web UI to real database data.
 */
@Controller()
@UseGuards(JwtGuard)
export class WebApiController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandingService: CompanyBrandingService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  @Get('dashboard/stats')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEmployees, attendanceToday, pendingLeave, lateToday] =
      await Promise.all([
        this.prisma.employee.count({ where: { employment_status: 'active' } }),
        this.prisma.attendance.count({
          where: { attendance_date: today, clock_in_time: { not: null } },
        }),
        this.prisma.leaveRequest.count({ where: { status: 'pending' } }),
        this.prisma.attendance.count({
          where: { attendance_date: today, is_tardy: true },
        }),
      ]);

    return {
      success: true,
      data: {
        total_employees: totalEmployees,
        present_today: attendanceToday,
        pending_leave: pendingLeave,
        late_today: lateToday,
      },
    };
  }

  @Get('employees')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployees() {
    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: { role: true, department: true, office: true },
      orderBy: { full_name: 'asc' },
    });

    return {
      success: true,
      data: employees.map((e) => this.formatEmployee(e)),
    };
  }

  @Get('employees/me')
  async getMyProfile(@Req() req: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: req.user.sub },
      include: { role: true, department: true, office: true },
    });

    return { success: true, data: employee ? this.formatEmployee(employee) : null };
  }

  @Get('employees/:id')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getEmployeeById(@Param('id') id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { role: true, department: true, office: true },
    });

    if (!employee) {
      return { success: false, message: 'Employee not found' };
    }

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Post('employees')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async createEmployee(@Body() body: any) {
    const role = body.role
      ? await this.prisma.role.findFirst({ where: { role_name: body.role } })
      : null;
    const department = body.department
      ? await this.prisma.department.findFirst({ where: { name: body.department } })
      : null;

    const employee = await this.prisma.employee.create({
      data: {
        employee_code: body.employee_code || `EMP-${Date.now()}`,
        full_name: body.full_name,
        email: body.email.toLowerCase(),
        phone: body.phone || '',
        role_id: role?.id,
        department_id: department?.id,
        employment_status: 'active',
        hire_date: new Date(),
      },
      include: { role: true, department: true, office: true },
    });

    return { success: true, data: this.formatEmployee(employee) };
  }

  @Get('attendance/dashboard')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getAttendanceDashboard(@Query('date') date?: string) {
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);

    const [totalEmployees, records] = await Promise.all([
      this.prisma.employee.count({ where: { employment_status: 'active' } }),
      this.prisma.attendance.findMany({
        where: { attendance_date: target },
        include: {
          employee: {
            select: { id: true, full_name: true, employee_code: true },
          },
        },
        orderBy: { clock_in_time: 'asc' },
      }),
    ]);

    const clockedIn = records.filter((r) => r.clock_in_time).length;
    const tardy = records.filter((r) => r.is_tardy).length;
    const absent = Math.max(0, totalEmployees - clockedIn);

    return {
      success: true,
      data: {
        total_employees: totalEmployees,
        clocked_in: clockedIn,
        tardy,
        absent,
        clocked_out: records.filter((r) => r.clock_out_time).length,
        records: records.map((r) => ({
          id: r.id,
          employee_id: r.employee_id,
          employee_name: r.employee.full_name,
          employee_code: r.employee.employee_code,
          attendance_date: r.attendance_date,
          clock_in_time: r.clock_in_time,
          clock_out_time: r.clock_out_time,
          is_tardy: r.is_tardy,
          tardiness_minutes: r.tardiness_minutes,
        })),
      },
    };
  }

  @Get('leaves/pending')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin', 'Supervisor')
  async getPendingLeaves(@Query('status') status?: string) {
    const where = status ? { status } : {};
    const leaves = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: { id: true, full_name: true, employee_code: true, email: true },
        },
      },
      orderBy: { submitted_at: 'desc' },
    });

    return {
      success: true,
      data: leaves.map((l) => ({
        id: l.id,
        employee_id: l.employee_id,
        employee_name: l.employee.full_name,
        employee_code: l.employee.employee_code,
        leave_type: l.leave_type,
        start_date: l.start_date,
        end_date: l.end_date,
        total_days: l.total_days,
        reason: l.reason,
        status: l.status,
        submitted_at: l.submitted_at,
      })),
    };
  }

  @Get('notifications/my-notifications')
  async getMyNotifications(@Req() req: any) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipient_id: req.user.sub },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return { success: true, data: notifications };
  }

  @Get('settings/company')
  async getCompanySettings() {
    const totalEmployees = await this.prisma.employee.count({
      where: { employment_status: 'active' },
    });

    const settings = await this.brandingService.getCompanySettingsMap();
    const publicBranding = await this.brandingService.getPublicBranding();

    return {
      success: true,
      data: {
        company_name: publicBranding.company_name,
        legal_name: publicBranding.legal_name || '',
        industry: settings['company.industry'] || 'Teknologi Informasi',
        tax_id: settings['company.tax_id'] || '',
        email: settings['company.email'] || '',
        phone: settings['company.phone'] || '',
        website: settings['company.website'] || '',
        address: settings['company.address'] || '',
        founded_year: settings['company.founded_year'] || '',
        total_employees: totalEmployees,
        logo_url: publicBranding.logo_url,
        logo_updated_at: publicBranding.logo_updated_at,
        branding: publicBranding.branding,
      },
    };
  }

  @Put('settings/company')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateCompanySettings(@Body() body: any, @Req() req: any) {
    const mapping: Record<string, string> = {
      company_name: 'company.name',
      legal_name: 'company.legal_name',
      industry: 'company.industry',
      tax_id: 'company.tax_id',
      email: 'company.email',
      phone: 'company.phone',
      website: 'company.website',
      address: 'company.address',
      founded_year: 'company.founded_year',
    };

    for (const [field, key] of Object.entries(mapping)) {
      if (body[field] !== undefined) {
        await this.prisma.systemSettings.upsert({
          where: { setting_key: key },
          update: {
            setting_value: body[field],
            last_modified_by: req.user.sub,
          },
          create: {
            setting_key: key,
            setting_value: body[field],
            setting_category: 'company',
            last_modified_by: req.user.sub,
          },
        });
      }
    }

    return this.getCompanySettings();
  }

  @Put('settings/company/branding')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateCompanyBranding(@Body() body: any, @Req() req: any) {
    const branding = await this.brandingService.saveBranding(body, req.user.sub);
    return { success: true, data: branding };
  }

  @Post('settings/company/logo')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('logo', createLogoMulterOptions()))
  async uploadCompanyLogo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const result = await this.brandingService.saveLogo(file, req.user.sub);
    return { success: true, data: result };
  }

  @Delete('settings/company/logo')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async deleteCompanyLogo(@Req() req: any) {
    await this.brandingService.deleteLogo(req.user.sub);
    return { success: true, message: 'Logo dihapus' };
  }

  @Get('settings/features')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async getFeatureSettings() {
    const data = await this.featureFlags.getAdminSettings();
    return { success: true, data };
  }

  @Put('settings/features')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async updateFeatureSettings(@Body() body: any, @Req() req: any) {
    const modules = this.featureFlags.validateModules(body?.modules ?? body);
    const saved = await this.featureFlags.saveModules(modules, req.user.sub);
    return { success: true, data: { modules: saved, definitions: (await this.featureFlags.getAdminSettings()).definitions } };
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('SuperAdmin', 'HR_Admin')
  async getAdminUsers() {
    const employees = await this.prisma.employee.findMany({
      where: { employment_status: 'active' },
      include: { role: true, department: true, office: true },
      orderBy: { full_name: 'asc' },
    });

    return { success: true, data: employees.map((e) => this.formatEmployee(e)) };
  }

  private formatEmployee(e: any) {
    return {
      id: e.id,
      employee_code: e.employee_code,
      full_name: e.full_name,
      email: e.email,
      phone: e.phone,
      role: e.role?.role_name || 'Employee',
      department: e.department?.name || null,
      office: e.office?.location_name || null,
      employment_status: e.employment_status,
      hire_date: e.hire_date,
      language_preference: e.language_preference,
    };
  }
}

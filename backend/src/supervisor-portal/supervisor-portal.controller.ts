import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupervisorOrAbove } from '../common/tenant.guard';
import { SupervisorPortalService } from './supervisor-portal.service';
import {
  SupervisorDashboardQueryDto,
  AttendanceApprovalDto,
  EmergencyReplacementDto,
  SiteHealthQueryDto,
  OperationalNotificationQueryDto,
  CreateIncidentDto,
  MusterRollQueryDto,
} from './dto/supervisor-dashboard.dto';

@ApiTags('Supervisor Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SupervisorOrAbove)
@Controller('supervisor-portal')
export class SupervisorPortalController {
  private readonly logger = new Logger(SupervisorPortalController.name);

  constructor(private readonly supervisorPortalService: SupervisorPortalService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get supervisor dashboard overview' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Query() queryDto: SupervisorDashboardQueryDto, @Request() req: any) {
    const supervisorId = req.user.userId;
    return this.supervisorPortalService.getDashboardOverview(queryDto, supervisorId);
  }

  @Get('sites/health')
  @ApiOperation({ summary: 'Get site health monitoring data' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Site health data retrieved successfully' })
  async getSiteHealth(@Query() queryDto: SiteHealthQueryDto, @Request() req: any) {
    const supervisorId = req.user.userId;
    return this.supervisorPortalService.getSiteHealthMonitoring(queryDto, supervisorId);
  }

  @Get('muster-roll')
  @ApiOperation({ summary: 'Get daily muster roll' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Muster roll data retrieved successfully' })
  async getMusterRoll(@Query() queryDto: MusterRollQueryDto, @Request() req: any) {
    const supervisorId = req.user.userId;
    return this.supervisorPortalService.getDailyMusterRoll(queryDto, supervisorId);
  }

  @Post('attendance/approval')
  @ApiOperation({ summary: 'Approve or reject attendance correction' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Attendance approval processed successfully' })
  async processAttendanceApproval(@Body() approvalDto: AttendanceApprovalDto, @Request() req: any) {
    const supervisorId = req.user.userId;
    return this.supervisorPortalService.processAttendanceApproval(approvalDto, supervisorId);
  }

  @Post('emergency-replacement')
  @ApiOperation({ summary: 'Handle emergency replacement workflow' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Emergency replacement processed successfully' })
  async handleEmergencyReplacement(@Body() replacementDto: EmergencyReplacementDto, @Request() req: any) {
    const supervisorId = req.user.userId;
    return this.supervisorPortalService.handleEmergencyReplacement(replacementDto, supervisorId);
  }
}
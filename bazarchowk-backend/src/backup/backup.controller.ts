import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BackupService } from './backup.service';

@ApiTags('Backup & Disaster Recovery (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('admin/backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a database backup to Cloudflare R2' })
  async triggerManualBackup(@CurrentUser() user: any) {
    return this.backupService.performBackup('MANUAL', user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get backup log history from database' })
  async getBackupHistory(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.backupService.getBackupHistory(page, limit);
  }

  @Get('list-r2')
  @ApiOperation({ summary: 'List all backup files directly from Cloudflare R2 storage' })
  async listR2Backups() {
    return this.backupService.listBackupsFromR2();
  }
}

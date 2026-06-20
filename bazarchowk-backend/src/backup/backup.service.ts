import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryStorageService } from '../cloudinary/cloudinary.service';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryStorageService,
  ) {}

  onModuleInit() {
    this.logger.log('Backup Service initialized. Daily backup scheduled at 03:00 AM.');
  }

  /**
   * Automatic daily backup at 3:00 AM every day
   */
  @Cron('0 3 * * *')
  async runScheduledBackup() {
    this.logger.log('[CRON] Starting automated daily database backup...');
    await this.performBackup('AUTO', null);
  }

  /**
   * Core backup engine: pg_dump → gzip → upload to Cloudinary
   */
  async performBackup(type: 'AUTO' | 'MANUAL', triggeredBy: string | null): Promise<any> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sql.gz`;
    const localPath = path.join(process.cwd(), 'tmp', filename);

    // Create tmp directory if not exists
    if (!fs.existsSync(path.join(process.cwd(), 'tmp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'tmp'), { recursive: true });
    }

    // Create a log entry in PENDING state
    const backupLog = await this.prisma.backupLog.create({
      data: {
        filename,
        storageKey: `db-backups/${filename}`,
        storageBucket: 'cloudinary',
        status: 'PENDING',
        type,
        triggeredBy,
      }
    });

    try {
      // 1. Run pg_dump to create a SQL dump
      const dbUrl = process.env.DATABASE_URL;
      this.logger.log(`[BACKUP] Running pg_dump → ${filename}`);
      await execAsync(`pg_dump "${dbUrl}" | gzip > "${localPath}"`);

      // 2. Read the compressed file
      const fileBuffer = fs.readFileSync(localPath);
      const fileSizeBytes = BigInt(fileBuffer.length);

      // 3. Upload to Cloudinary
      this.logger.log(`[BACKUP] Uploading ${filename} to Cloudinary...`);
      await this.cloudinaryService.uploadFile(fileBuffer, 'db-backups', filename, 'raw');

      // 4. Update log to SUCCESS
      await this.prisma.backupLog.update({
        where: { id: backupLog.id },
        data: { status: 'SUCCESS', sizeBytes: fileSizeBytes }
      });

      this.logger.log(`[BACKUP] ✅ Successfully uploaded ${filename} (${fileSizeBytes} bytes)`);

      // 5. Cleanup local tmp file
      fs.unlinkSync(localPath);

      return { success: true, filename, sizeBytes: fileSizeBytes.toString() };

    } catch (error: any) {
      this.logger.error(`[BACKUP] ❌ Backup FAILED: ${error.message}`, error.stack);

      // Update log to FAILED state
      await this.prisma.backupLog.update({
        where: { id: backupLog.id },
        data: { status: 'FAILED', errorMessage: error.message }
      });

      // Cleanup partial tmp file if exists
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

      throw error;
    }
  }

  /**
   * List all backups stored in Cloudinary
   */
  async listBackupsFromCloudinary(): Promise<any> {
    return this.cloudinaryService.listFiles('db-backups');
  }

  /**
   * List backup logs from database (with pagination)
   */
  async getBackupHistory(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.backupLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.backupLog.count()
    ]);
    return { data: logs, total, page, limit };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { pipeline } from 'stream/promises';

const execAsync = promisify(exec);

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly prisma: PrismaService) {
    // Cloudflare R2 is S3-compatible — same SDK, different endpoint
    this.bucket = process.env.R2_BUCKET_NAME || 'bazarchowk-backups';
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT, // e.g. https://<account_id>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

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
   * Core backup engine: pg_dump → gzip → upload to Cloudflare R2
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
        storageBucket: this.bucket,
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

      // 3. Upload to Cloudflare R2
      this.logger.log(`[BACKUP] Uploading ${filename} to R2 bucket: ${this.bucket}`);
      await this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: `db-backups/${filename}`,
        Body: fileBuffer,
        ContentType: 'application/gzip',
        Metadata: {
          'backup-type': type,
          'triggered-by': triggeredBy || 'scheduler',
          'timestamp': new Date().toISOString(),
        }
      }));

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
   * List all backups stored in R2
   */
  async listBackupsFromR2(): Promise<any> {
    const response = await this.s3.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: 'db-backups/',
    }));
    return response.Contents || [];
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

import cron, { ScheduledTask } from 'node-cron';
import { logGeneratorService } from '../services/log-generator.service.js';
import { chaosBotService } from '../services/chaos-bot.service.js';
import { schemaSyncService } from '../services/schema-sync.service.js';

class Scheduler {
  private tasks: ScheduledTask[] = [];

  /**
   * Start all scheduled jobs
   */
  start() {
    console.log('📅 Starting cron scheduler...');

    // Generate random logs every 5 minutes
    const logGeneratorTask = cron.schedule('*/5 * * * *', async () => {
      const startTime = new Date();
      console.log(`\n⏰ [CRON] Log generator triggered at ${startTime.toLocaleString()}`);

      try {
        await logGeneratorService.generateLogsForAllAgents();
        const endTime = new Date();
        const duration = endTime.getTime() - startTime.getTime();
        console.log(`✅ [CRON] Log generator completed in ${duration}ms`);
      } catch (error) {
        console.error('❌ [CRON] Error in log generator cron job:', error);
      }
    });

    // this.tasks.push(logGeneratorTask);

    // Fire chaos bot request every second
    chaosBotService.start();
    const chaosBotTask = cron.schedule('* * * * * *', async () => {
      await chaosBotService.fireRequest();
    });

    this.tasks.push(chaosBotTask);

    // Process pending schema syncs every minute
    const schemaSyncTask = cron.schedule('* * * * *', async () => {
      try {
        await schemaSyncService.processPendingSyncs();
      } catch (error) {
        console.error('❌ [CRON] Error in schema sync cron job:', error);
      }
    });

    this.tasks.push(schemaSyncTask);

    console.log('✓ Cron scheduler started');
    console.log('  - Log generator: Every 5 minutes');
    console.log('  - Chaos bot: Every second');
    console.log('  - Schema sync: Every minute');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    console.log('Stopping cron scheduler...');

    for (const task of this.tasks) {
      task.stop();
    }

    this.tasks = [];
    chaosBotService.stop();
    console.log('✓ Cron scheduler stopped');
  }
}

export const scheduler = new Scheduler();

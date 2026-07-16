import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { PayrollScheduler } from './payroll.scheduler';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, PayrollScheduler],
})
export class PayrollModule {}

import { MODULE_METADATA } from '@nestjs/common/constants';
import { ApprovalModule } from '../approval/approval.module';
import { TransactionModule } from './transaction.module';

describe('TransactionModule dependency wiring', () => {
  it('imports ApprovalModule for ApprovalService injection', () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, TransactionModule) || [];

    expect(imports).toContain(ApprovalModule);
  });
});

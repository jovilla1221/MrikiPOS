import { METHOD_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { UserRole } from '@mrikipos/shared-types';
import { TransactionController } from './transaction.controller';

describe('TransactionController RBAC', () => {
  it('requires OWNER for direct void', () => {
    const handler = TransactionController.prototype.voidTransaction;

    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBeDefined();
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([UserRole.OWNER]);
  });
});

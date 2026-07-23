import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';

// Import all controller classes
import { AuthController } from '../../modules/auth/auth.controller';
import { ApprovalController } from '../../modules/approval/approval.controller';
import { AuditController } from '../../modules/audit/audit.controller';
import { CategoryController } from '../../modules/category/category.controller';
import { UserController } from '../../modules/user/user.controller';
import { CreditController } from '../../modules/credit/credit.controller';
import { CustomerController } from '../../modules/customer/customer.controller';
import { HealthController } from '../../modules/health/health.controller';
import { InventoryController } from '../../modules/inventory/inventory.controller';
import { PaymentController } from '../../modules/payment/payment.controller';
import { ProductController } from '../../modules/product/product.controller';
import { ReportController } from '../../modules/report/report.controller';
import { ShiftController } from '../../modules/shift/shift.controller';
import { TenantController } from '../../modules/tenant/tenant.controller';
import { TransactionController } from '../../modules/transaction/transaction.controller';
import { UploadController } from '../../modules/upload/upload.controller';

describe('RBAC Metadata Verification (S7-A2)', () => {
  const controllers = [
    { name: 'AuthController', class: AuthController },
    { name: 'ApprovalController', class: ApprovalController },
    { name: 'AuditController', class: AuditController },
    { name: 'CategoryController', class: CategoryController },
    { name: 'CreditController', class: CreditController },
    { name: 'CustomerController', class: CustomerController },
    { name: 'HealthController', class: HealthController },
    { name: 'InventoryController', class: InventoryController },
    { name: 'PaymentController', class: PaymentController },
    { name: 'ProductController', class: ProductController },
    { name: 'ReportController', class: ReportController },
    { name: 'ShiftController', class: ShiftController },
    { name: 'TenantController', class: TenantController },
    { name: 'TransactionController', class: TransactionController },
    { name: 'UploadController', class: UploadController },
    { name: 'UserController', class: UserController },
  ];

  controllers.forEach(({ name, class: ControllerClass }) => {
    describe(name, () => {
      const prototype = ControllerClass.prototype;
      const methodNames = Object.getOwnPropertyNames(prototype).filter((item) => {
        if (item === 'constructor' || typeof prototype[item] !== 'function') {
          return false;
        }
        // Ensure method is an HTTP handler decorated with @Get, @Post, etc.
        const path = Reflect.getMetadata(PATH_METADATA, prototype[item]);
        const method = Reflect.getMetadata(METHOD_METADATA, prototype[item]);
        return path !== undefined || method !== undefined;
      });

      methodNames.forEach((methodName) => {
        it(`should have explicit @Roles() or @Public() metadata on HTTP handler ${methodName}`, () => {
          const handler = prototype[methodName];
          const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler);
          const roles = Reflect.getMetadata(ROLES_KEY, handler);

          if (isPublic) {
            expect(isPublic).toBe(true);
          } else {
            expect(roles).toBeDefined();
            expect(Array.isArray(roles)).toBe(true);
            expect(roles.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });
});

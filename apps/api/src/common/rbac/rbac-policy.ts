import { UserRole, ApprovalType } from '@mrikipos/shared-types';

export function canApprove(type: ApprovalType, role: UserRole): boolean {
  if (role === UserRole.OWNER || role === UserRole.MANAGER) {
    return true;
  }
  return false;
}

export function canManageUser(actorRole: UserRole): boolean {
  return actorRole === UserRole.OWNER;
}

export function canRequestApproval(type: ApprovalType, role: UserRole): boolean {
  switch (type) {
    case ApprovalType.VOID:
      return role === UserRole.KASIR || role === UserRole.MANAGER || role === UserRole.OWNER;
    case ApprovalType.REFUND:
      return role === UserRole.KASIR || role === UserRole.MANAGER || role === UserRole.OWNER;
    case ApprovalType.PRICE_CHANGE:
      return role === UserRole.STAFF || role === UserRole.KASIR || role === UserRole.MANAGER || role === UserRole.OWNER;
    case ApprovalType.STOCK_TRANSFER:
      return role === UserRole.STAFF || role === UserRole.MANAGER || role === UserRole.OWNER;
    case ApprovalType.SHIFT_CLOSE:
      return role === UserRole.KASIR || role === UserRole.MANAGER || role === UserRole.OWNER;
    default:
      return false;
  }
}

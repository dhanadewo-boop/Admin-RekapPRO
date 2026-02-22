// Role check helpers — used by components for access control
export function isAdmin(user) { return user?.role === 'admin'; }
export function isPimpinan(user) { return user?.role === 'pimpinan'; }
export function isMarketing(user) { return user?.role === 'marketing'; }
export function canUpload(user) { return isAdmin(user); }
export function canManageTargets(user) { return isAdmin(user) || isPimpinan(user); }
export function canViewTargets(user) { return isAdmin(user) || isPimpinan(user); }

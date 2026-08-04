import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('adminToken');


  if (token) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};

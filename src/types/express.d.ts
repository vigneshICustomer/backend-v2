import { User } from './api';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: string;
      tenantId?: string;
    }
  }
}

import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { registerSchema, loginSchema } from './auth.validation';

const service = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    const result = await service.register(input);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await service.login(input);
    res.status(200).json(result);
  }
}

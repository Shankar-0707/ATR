/// <reference types="cookie-parser" />

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        plan: "free" | "pro" | "admin";
      };
    }
  }
}

export {};

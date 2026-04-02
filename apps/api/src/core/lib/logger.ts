import { env } from "../../config/env.js";
import { createLogger, format, transports } from "winston";

const developmentFormat = format.combine(
  format.colorize(),
  format.timestamp(),
  format.errors({ stack: true }),
  format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const extras = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    const trace = typeof stack === "string" ? `\n${stack}` : "";
    return `${timestamp} ${level}: ${message}${extras}${trace}`;
  }),
);

const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.json(),
);

export const logger = createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: {
    service: "api",
    environment: env.NODE_ENV,
  },
  format: env.NODE_ENV === "production" ? productionFormat : developmentFormat,
  transports: [new transports.Console()],
});

import { createLogger, transports, format } from "winston";
import path from "path";

const logger = createLogger({
  transports: [
    new transports.Console({
      level: "info",
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp(),
        format.errors({ stack: true }),
        format.align(),
        format.printf((info: any) => {
          const { timestamp, level, message, stack } = info as any;
          const file = stack
            ? stack.split("\n")[1]?.match(/\((.*):\d+:\d+\)$/)?.[1] || ""
            : "";
          return `${timestamp} [${level}] ${path.basename(file)} : ${message} ${
            stack ? `\n${stack}` : ""
          }`;
        })
      ),
    }),
    new transports.File({
      filename: "server-info.log",
      level: "error",
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

export default logger;

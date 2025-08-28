import winston from "winston";
const {combine, errors, json, timestamp } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

export default logger

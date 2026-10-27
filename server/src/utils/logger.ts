export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export const c = {
  reset: "\x1b[0m",
  bold: (s: string | number) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string | number) => `\x1b[2m${s}\x1b[0m`,
  underline: (s: string | number) => `\x1b[4m${s}\x1b[0m`,
  gray: (s: string | number) => `\x1b[90m${s}\x1b[0m`,
  red: (s: string | number) => `\x1b[31m${s}\x1b[0m`,
  brightRed: (s: string | number) => `\x1b[91m${s}\x1b[0m`,
  green: (s: string | number) => `\x1b[32m${s}\x1b[0m`,
  brightGreen: (s: string | number) => `\x1b[92m${s}\x1b[0m`,
  yellow: (s: string | number) => `\x1b[33m${s}\x1b[0m`,
  brightYellow: (s: string | number) => `\x1b[93m${s}\x1b[0m`,
  blue: (s: string | number) => `\x1b[34m${s}\x1b[0m`,
  brightBlue: (s: string | number) => `\x1b[94m${s}\x1b[0m`,
  magenta: (s: string | number) => `\x1b[35m${s}\x1b[0m`,
  brightMagenta: (s: string | number) => `\x1b[95m${s}\x1b[0m`,
  cyan: (s: string | number) => `\x1b[36m${s}\x1b[0m`,
  brightCyan: (s: string | number) => `\x1b[96m${s}\x1b[0m`,
  white: (s: string | number) => `\x1b[37m${s}\x1b[0m`,
  brightWhite: (s: string | number) => `\x1b[97m${s}\x1b[0m`,
};

const levelColorMap: Record<LogLevel, (s: string) => string> = {
  INFO: (s) => `\x1b[1;32m${s}\x1b[0m`, // Bold Green
  WARN: (s) => `\x1b[1;33m${s}\x1b[0m`, // Bold Yellow
  ERROR: (s) => `\x1b[1;31m${s}\x1b[0m`, // Bold Red
  DEBUG: (s) => `\x1b[1;35m${s}\x1b[0m`, // Bold Magenta
};

const contextColorMap: Record<string, (s: string) => string> = {
  APP: (s) => `\x1b[1;35m${s}\x1b[0m`, // Bold Magenta
  DB: (s) => `\x1b[1;36m${s}\x1b[0m`, // Bold Cyan
  HTTP: (s) => `\x1b[1;33m${s}\x1b[0m`, // Bold Yellow
  AUTH: (s) => `\x1b[1;34m${s}\x1b[0m`, // Bold Blue
  SCHEDULER: (s) => `\x1b[1;32m${s}\x1b[0m`, // Bold Green
};

export const logger = {
  format(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context.toUpperCase();

    const coloredTime = `\x1b[90m[${timestamp}]\x1b[0m`;
    const levelFormatter = levelColorMap[level] || ((s) => s);
    const contextFormatter = contextColorMap[ctx] || ((s) => `\x1b[1;37m${s}\x1b[0m`);

    const coloredLevel = levelFormatter(`[${level}]`);
    const coloredContext = contextFormatter(`[${ctx}]`);

    return `${coloredTime} ${coloredLevel} ${coloredContext} ${message}`;
  },

  info(context: string, message: string, ...args: unknown[]): void {
    const formatted = this.format("INFO", context, message);
    if (args.length > 0) {
      console.log(formatted, ...args);
    } else {
      console.log(formatted);
    }
  },

  warn(context: string, message: string, ...args: unknown[]): void {
    const formatted = this.format("WARN", context, message);
    if (args.length > 0) {
      console.warn(formatted, ...args);
    } else {
      console.warn(formatted);
    }
  },

  error(context: string, message: string, ...args: unknown[]): void {
    const formatted = this.format("ERROR", context, message);
    if (args.length > 0) {
      console.error(formatted, ...args);
    } else {
      console.error(formatted);
    }
  },

  debug(context: string, message: string, ...args: unknown[]): void {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
      const formatted = this.format("DEBUG", context, message);
      if (args.length > 0) {
        console.debug(formatted, ...args);
      } else {
        console.debug(formatted);
      }
    }
  },
};

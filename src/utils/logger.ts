import chalk from 'chalk';
import ora from 'ora';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'silent'];
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) console.log(chalk.gray('[debug]'), ...args);
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) console.log(chalk.blue('ℹ'), ...args);
  },
  success: (...args: unknown[]): void => {
    if (shouldLog('info')) console.log(chalk.green('✔'), ...args);
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) console.log(chalk.yellow('⚠'), ...args);
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) console.error(chalk.red('✖'), ...args);
  },
  fatal: (...args: unknown[]): void => {
    console.error(chalk.bgRed.white(' FATAL '), ...args);
    process.exit(1);
  },
  raw: (...args: unknown[]): void => {
    console.log(...args);
  },
};

export function createSpinner(text: string) {
  const spinner = ora({ text, color: 'cyan', spinner: 'dots' });
  return spinner;
}

export function formatScore(score: number): string {
  if (score >= 80) return chalk.green(`${score}`);
  if (score >= 50) return chalk.yellow(`${score}`);
  return chalk.red(`${score}`);
}

export function formatLevel(level: string): string {
  switch (level) {
    case 'good': return chalk.green('good');
    case 'okay': return chalk.yellow('okay');
    case 'risky': return chalk.red('risky');
    case 'critical': return chalk.bgRed.white(' CRITICAL ');
    default: return level;
  }
}

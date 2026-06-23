import chalk, { ChalkInstance } from 'chalk';
import { Formatter, Report } from './base.js';

function actionIcon(action: string): string {
  switch (action) {
    case 'ok': return chalk.green('  ✓');
    case 'update': return chalk.blue('  ↑');
    case 'update-major': return chalk.yellow(' ⚠');
    case 'replace': return '🔴';
    case 'review': return chalk.cyan('  ?');
    default: return '  ·';
  }
}

function shortAction(action: string): string {
  switch (action) {
    case 'ok': return 'ok';
    case 'update': return 'update';
    case 'update-major': return 'MAJOR';
    case 'replace': return 'REPLACE';
    case 'review': return 'review';
    default: return action;
  }
}

function levelColor(level: string): ChalkInstance {
  switch (level) {
    case 'good': return chalk.green;
    case 'okay': return chalk.yellow;
    case 'risky': return chalk.red;
    case 'critical': return chalk.bgRed.white;
    default: return chalk.white;
  }
}

export const TableFormatter: Formatter = {
  name: 'table',

  format(report: Report): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold.cyan('depcheck-ai — Dependency Health Report'));
    lines.push(chalk.gray('━'.repeat(70)));
    lines.push(
      chalk.bold(
        padRight('Package', 22) +
        padRight('Ver', 12) +
        padRight('Health', 10) +
        padRight('Score', 8) +
        'Action'
      )
    );
    lines.push(chalk.gray('─'.repeat(70)));

    for (const dep of report.dependencies) {
      const color = levelColor(dep.health.level);
      const icon = actionIcon(dep.recommendation.action);
      const actionText = dep.recommendation.action === 'replace' && dep.recommendation.suggested
        ? `REPLACE → ${dep.recommendation.suggested}`
        : shortAction(dep.recommendation.action);

      let actionStr = actionText;
      if (dep.recommendation.action === 'replace') {
        actionStr = chalk.red(actionText);
      } else if (dep.recommendation.action === 'update' || dep.recommendation.action === 'update-major') {
        actionStr = chalk.blue(actionText);
      } else if (dep.recommendation.action === 'ok') {
        actionStr = chalk.green(actionText);
      }

      const healthLabel = dep.health.level === 'critical'
        ? chalk.bgRed.white(' CRITICAL ')
        : color(padRight(dep.health.level, 10));

      lines.push(
        padRight(dep.name, 22) +
        padRight(dep.version, 12) +
        healthLabel +
        padRight(String(dep.health.overall), 8) +
        icon + ' ' + actionStr
      );
    }

    lines.push(chalk.gray('─'.repeat(70)));

    const summaryParts: string[] = [];
    summaryParts.push(`${report.total} dependencies`);
    summaryParts.push(chalk.red(`${report.summary.critical} critical`));
    summaryParts.push(chalk.yellow(`${report.summary.risky} risky`));
    summaryParts.push(chalk.green(`${report.summary.good} good`));
    lines.push(summaryParts.join(' | '));

    lines.push('');
    return lines.join('\n');
  },
};

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

import { Formatter, Report } from './base.js';

export const JsonFormatter: Formatter = {
  name: 'json',

  format(report: Report): string {
    return JSON.stringify(report, null, 2);
  },
};

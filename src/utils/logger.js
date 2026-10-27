const fs = require('fs');
const path = require('path');
const paths = require('./paths');

class Logger {
  constructor(name = 'app') {
    this.name = name;
    this.logFile = path.join(paths.logs, `${name}.log`);
    this.maxFileSize = 2 * 1024 * 1024; // 2MB max
  }

  formatMessage(level, message, meta = null) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ' ' + (typeof meta === 'object' ? JSON.stringify(meta) : String(meta)) : '';
    return `[${timestamp}] [${level}] [${this.name}] ${message}${metaStr}\n`;
  }

  write(level, message, meta) {
    const formatted = this.formatMessage(level, message, meta);
    if (level === 'ERROR') {
      console.error(formatted.trim());
    } else if (level === 'WARN') {
      console.warn(formatted.trim());
    } else {
      console.log(formatted.trim());
    }

    try {
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        if (stats.size > this.maxFileSize) {
          const oldFile = path.join(paths.logs, `${this.name}.old.log`);
          if (fs.existsSync(oldFile)) {
            try { fs.unlinkSync(oldFile); } catch (e) {}
          }
          fs.renameSync(this.logFile, oldFile);
        }
      }
      fs.appendFileSync(this.logFile, formatted, 'utf8');
    } catch (e) {
      // Avoid crashing if logging fails
    }
  }

  info(msg, meta) { this.write('INFO', msg, meta); }
  warn(msg, meta) { this.write('WARN', msg, meta); }
  error(msg, meta) { this.write('ERROR', msg, meta); }
  debug(msg, meta) {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      this.write('DEBUG', msg, meta);
    }
  }
}

module.exports = {
  Logger,
  logger: new Logger('main')
};

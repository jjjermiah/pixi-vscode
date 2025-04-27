// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as util from "util";
import { Disposable, LogOutputChannel } from "vscode";

type Arguments = unknown[];
/**
 * ## OutputChannelLogger
 *
 * This module provides a logging utility class `OutputChannelLogger` that allows logging messages to a specified output channel.
 * The logger supports various log levels including trace, error, warn, info, and verbose.
 *
 * ### Usage
 *
 * To use the `OutputChannelLogger`, you need to create an instance of it by passing a `LogOutputChannel` to its constructor.
 *
 * ```typescript
 * import { OutputChannelLogger } from './logging';
 * import { LogOutputChannel } from 'some-logging-library';
 *
 * const logChannel = new LogOutputChannel();
 * const logger = new OutputChannelLogger(logChannel);
 *
 * logger.traceLog('This is a trace log message');
 * logger.traceError('This is an error message');
 * logger.traceWarn('This is a warning message');
 * logger.traceInfo('This is an info message');
 * logger.traceVerbose('This is a verbose message');
 * ```
 *
 * ### Methods
 *
 * - `traceLog(...data: Arguments): void` - Logs a trace message.
 * - `traceError(...data: Arguments): void` - Logs an error message.
 * - `traceWarn(...data: Arguments): void` - Logs a warning message.
 * - `traceInfo(...data: Arguments): void` - Logs an info message.
 * - `traceVerbose(...data: Arguments): void` - Logs a verbose message.
 *
 * @class OutputChannelLogger
 * @param {LogOutputChannel} channel - The output channel to which logs will be written.
 */
class OutputChannelLogger {
  constructor(private readonly channel: LogOutputChannel) {}

  public traceLog(...data: Arguments): void {
    this.channel.appendLine(util.format(...data));
  }

  public traceError(...data: Arguments): void {
    this.channel.error(util.format(...data));
  }

  public traceWarn(...data: Arguments): void {
    this.channel.warn(util.format(...data));
  }

  public traceInfo(...data: Arguments): void {
    this.channel.info(util.format(...data));
  }

  public traceDebug(...data: Arguments): void {
    this.channel.debug(util.format(...data));
  }
}

let channel: OutputChannelLogger | undefined;
export function registerLogger(logChannel: LogOutputChannel): Disposable {
  channel = new OutputChannelLogger(logChannel);
  return {
    dispose: () => {
      channel = undefined;
    },
  };
}

export function log(...args: Arguments): void {
  channel?.traceLog(...args);
}

export function error(...args: Arguments): void {
  channel?.traceError(...args);
}

export function warn(...args: Arguments): void {
  channel?.traceWarn(...args);
}

export function info(...args: Arguments): void {
  channel?.traceInfo(...args);
}

export function debug(...args: Arguments): void {
  channel?.traceDebug(...args);
}

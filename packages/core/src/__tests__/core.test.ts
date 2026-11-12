import { describe, it, expect, vi } from 'vitest';
import { createDefaultConfig } from '../config.js';
import { EventBus } from '../events.js';
import { Logger } from '../logger.js';
import { ArletexError, ValidationError } from '../errors.js';

describe('Core Package', () => {
  describe('Config', () => {
    it('creates default config with sensible fallbacks', () => {
      const config = createDefaultConfig();
      expect(config.dataDirectory).toBeDefined();
      expect(config.databasePath).toContain('arletex.sqlite');
      expect(config.inference.provider).toBe('colibri');
      expect(config.inference.serverUrl).toBe('http://127.0.0.1:8000');
      expect(config.inference.contextSize).toBe(8192);
      expect(config.logLevel).toBe('info');
    });

    it('honors config overrides', () => {
      const config = createDefaultConfig({
        logLevel: 'debug',
        inference: {
          serverUrl: 'http://localhost:9999',
          defaultModelId: 'custom-model',
          temperature: 0.2,
          topP: 0.8,
          maxTokens: 1024,
          contextSize: 4096,
          stopSequences: ['###'],
        },
      });

      expect(config.logLevel).toBe('debug');
      expect(config.inference.serverUrl).toBe('http://localhost:9999');
      expect(config.inference.defaultModelId).toBe('custom-model');
      expect(config.inference.temperature).toBe(0.2);
    });
  });

  describe('EventBus', () => {
    it('subscribes and receives emitted events', () => {
      const bus = new EventBus();
      const fn = vi.fn();

      bus.on('test-event', fn);
      bus.emit('test-event', { value: 42 });

      expect(fn).toHaveBeenCalledWith({ value: 42 });
    });

    it('unsubscribes properly', () => {
      const bus = new EventBus();
      const fn = vi.fn();

      const unsubscribe = bus.on('test-event', fn);
      unsubscribe();
      bus.emit('test-event', { value: 100 });

      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('Logger', () => {
    it('logs according to min level', () => {
      const logger = new Logger('Test', 'warn');
      const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('should be ignored');
      logger.warn('warning message');

      expect(spyLog).not.toHaveBeenCalled();
      expect(spyWarn).toHaveBeenCalled();
      spyWarn.mockRestore();
      spyLog.mockRestore();
    });
  });

  describe('Errors', () => {
    it('creates typed errors with stack trace and code', () => {
      const err = new ValidationError('Invalid title', { field: 'title' });
      expect(err).toBeInstanceOf(ArletexError);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Invalid title');
      expect(err.details).toEqual({ field: 'title' });
    });
  });
});

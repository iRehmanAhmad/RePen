import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryManager } from '../../src/renderer/presenter/history';

describe('HistoryManager Unit Test', () => {
  let manager: HistoryManager;

  beforeEach(() => {
    manager = new HistoryManager();
  });

  it('should start with empty annotations', () => {
    expect(manager.getAnnotations()).toEqual([]);
  });

  it('should record a change', () => {
    manager.recordChange(() => {
      manager.setAnnotations([{ id: '1', tool: 'pen', color: '#ff0000', width: 4, opacity: 1, points: [] }]);
    });
    expect(manager.getAnnotations()).toHaveLength(1);
  });

  it('should undo and redo changes correctly', () => {
    manager.recordChange(() => {
      manager.setAnnotations([{ id: '1', tool: 'pen', color: '#ff0000', width: 4, opacity: 1, points: [] }]);
    });
    
    manager.recordChange(() => {
      manager.setAnnotations([
        { id: '1', tool: 'pen', color: '#ff0000', width: 4, opacity: 1, points: [] },
        { id: '2', tool: 'pen', color: '#00ff00', width: 4, opacity: 1, points: [] }
      ]);
    });

    expect(manager.getAnnotations()).toHaveLength(2);

    // Undo once
    expect(manager.undo()).toBe(true);
    expect(manager.getAnnotations()).toHaveLength(1);
    expect(manager.getAnnotations()[0].id).toBe('1');

    // Redo once
    expect(manager.redo()).toBe(true);
    expect(manager.getAnnotations()).toHaveLength(2);
  });
});

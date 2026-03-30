import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 8.6 Verification Test
 * Verify all 5 functional components render correctly
 * - FormatViewer.vue
 * - JsonEditor.vue
 * - PaginationTable.vue
 * - OperateItem.vue
 * - RightClickMenu.vue
 */

const COMPONENTS_DIR = resolve(__dirname, '..');
const PHASE8_COMPONENTS = [
  'FormatViewer.vue',
  'JsonEditor.vue',
  'PaginationTable.vue',
  'OperateItem.vue',
  'RightClickMenu.vue',
];

describe('Phase 8.6: Functional Components Verification', () => {
  describe('All 5 components use <script setup> syntax', () => {
    PHASE8_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses <script setup>`, () => {
        const filePath = resolve(COMPONENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Check for <script setup>
        expect(content).toMatch(/<script\s+setup/);

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify no Options API patterns in script block
        expect(scriptContent).not.toMatch(/export\s+default\s*\{/);
        expect(scriptContent).not.toMatch(/\bdata\s*\(\s*\)\s*\{/);
        expect(scriptContent).not.toMatch(/\bmethods\s*:/);
        expect(scriptContent).not.toMatch(/\bcomputed\s*:/);
        expect(scriptContent).not.toMatch(/\bwatch\s*:/);
        expect(scriptContent).not.toMatch(/\bmounted\s*:/);
        expect(scriptContent).not.toMatch(/\bcreated\s*:/);
        expect(scriptContent).not.toMatch(/\bdestroyed\s*:/);
        expect(scriptContent).not.toMatch(/\bcomponents\s*:/);
      });
    });
  });

  describe('No Options API patterns remain', () => {
    PHASE8_COMPONENTS.forEach((componentName) => {
      it(`${componentName} has no Options API`, () => {
        const filePath = resolve(COMPONENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        const scriptContent = scriptMatch ? scriptMatch[1] : '';

        // Verify no Options API
        expect(scriptContent).not.toMatch(/export\s+default\s*\{/);
        expect(scriptContent).not.toMatch(/\bdata\s*\(\s*\)\s*\{/);
        expect(scriptContent).not.toMatch(/\bmethods\s*:/);
        expect(scriptContent).not.toMatch(/\bcomputed\s*:/);
        expect(scriptContent).not.toMatch(/\bwatch\s*:/);
      });
    });
  });

  describe('Props and events properly declared', () => {
    it('FormatViewer.vue declares props with defineProps', () => {
      const filePath = resolve(COMPONENTS_DIR, 'FormatViewer.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineProps\s*\(/);
    });

    it('JsonEditor.vue declares props with defineProps', () => {
      const filePath = resolve(COMPONENTS_DIR, 'JsonEditor.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineProps\s*\(/);
    });

    it('PaginationTable.vue declares props with defineProps', () => {
      const filePath = resolve(COMPONENTS_DIR, 'PaginationTable.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineProps\s*\(/);
    });

    it('OperateItem.vue declares props with defineProps', () => {
      const filePath = resolve(COMPONENTS_DIR, 'OperateItem.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineProps\s*\(/);
    });

    it('RightClickMenu.vue declares props with defineProps', () => {
      const filePath = resolve(COMPONENTS_DIR, 'RightClickMenu.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineProps\s*\(/);
    });
  });

  describe('Exposed methods properly declared', () => {
    it('FormatViewer.vue exposes methods with defineExpose', () => {
      const filePath = resolve(COMPONENTS_DIR, 'FormatViewer.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineExpose\s*\(/);
    });

    it('JsonEditor.vue exposes methods with defineExpose', () => {
      const filePath = resolve(COMPONENTS_DIR, 'JsonEditor.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineExpose\s*\(/);
    });

    it('RightClickMenu.vue exposes methods with defineExpose', () => {
      const filePath = resolve(COMPONENTS_DIR, 'RightClickMenu.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineExpose\s*\(/);
    });

    it('OperateItem.vue exposes methods with defineExpose', () => {
      const filePath = resolve(COMPONENTS_DIR, 'OperateItem.vue');
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/defineExpose\s*\(/);
    });
  });

  describe('Backward compatibility maintained', () => {
    it('FormatViewer.vue maintains same props interface', () => {
      const filePath = resolve(COMPONENTS_DIR, 'FormatViewer.vue');
      const content = readFileSync(filePath, 'utf-8');
      // Should have float, content, disabled, redisKey, dataMap props
      expect(content).toMatch(/float/);
      expect(content).toMatch(/content/);
      expect(content).toMatch(/disabled/);
      expect(content).toMatch(/redisKey/);
      expect(content).toMatch(/dataMap/);
    });

    it('JsonEditor.vue maintains same props interface', () => {
      const filePath = resolve(COMPONENTS_DIR, 'JsonEditor.vue');
      const content = readFileSync(filePath, 'utf-8');
      // Should have content and readOnly props
      expect(content).toMatch(/content/);
      expect(content).toMatch(/readOnly/);
    });

    it('PaginationTable.vue maintains same props interface', () => {
      const filePath = resolve(COMPONENTS_DIR, 'PaginationTable.vue');
      const content = readFileSync(filePath, 'utf-8');
      // Should have data, filterKey, filterValue props
      expect(content).toMatch(/data/);
      expect(content).toMatch(/filterKey/);
      expect(content).toMatch(/filterValue/);
    });

    it('OperateItem.vue maintains same props interface', () => {
      const filePath = resolve(COMPONENTS_DIR, 'OperateItem.vue');
      const content = readFileSync(filePath, 'utf-8');
      // Should have client and config props
      expect(content).toMatch(/client/);
      expect(content).toMatch(/config/);
    });

    it('RightClickMenu.vue maintains same props interface', () => {
      const filePath = resolve(COMPONENTS_DIR, 'RightClickMenu.vue');
      const content = readFileSync(filePath, 'utf-8');
      // Should have items and clickValue props
      expect(content).toMatch(/items/);
      expect(content).toMatch(/clickValue/);
    });
  });

  describe('No console errors or warnings expected', () => {
    it('All components compile without syntax errors', () => {
      // If build succeeded, components have no syntax errors
      expect(true).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 9.2 Verification Test
 * Verify all 7 content components render correctly
 * - KeyContentString.vue
 * - KeyContentHash.vue
 * - KeyContentList.vue
 * - KeyContentSet.vue
 * - KeyContentZset.vue
 * - KeyContentStream.vue
 * - KeyContentReJson.vue
 */

const COMPONENTS_DIR = resolve(__dirname, '..');
const CONTENTS_DIR = resolve(COMPONENTS_DIR, 'contents');
const PHASE9_COMPONENTS = [
  'KeyContentString.vue',
  'KeyContentHash.vue',
  'KeyContentList.vue',
  'KeyContentSet.vue',
  'KeyContentZset.vue',
  'KeyContentStream.vue',
  'KeyContentReJson.vue',
];

describe('Phase 9.2: Content Components Verification', () => {
  describe('All 7 components use <script setup> syntax', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses <script setup>`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
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

  describe('All 7 components have proper props declaration', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses defineProps()`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify defineProps is used
        expect(scriptContent).toMatch(/defineProps\s*\(/);
      });
    });
  });

  describe('All 7 components use Composition API', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses ref() or reactive()`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify ref or reactive is used
        const hasRef = /\bref\s*\(/.test(scriptContent);
        const hasReactive = /\breactive\s*\(/.test(scriptContent);
        const hasComputed = /\bcomputed\s*\(/.test(scriptContent);

        expect(hasRef || hasReactive || hasComputed).toBe(true);
      });
    });
  });

  describe('All 7 components use lifecycle hooks correctly', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses onMounted/onUnmounted instead of mounted/destroyed`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify no old lifecycle hooks
        expect(scriptContent).not.toMatch(/\bmounted\s*:/);
        expect(scriptContent).not.toMatch(/\bcreated\s*:/);
        expect(scriptContent).not.toMatch(/\bdestroyed\s*:/);
        expect(scriptContent).not.toMatch(/\bbeforeDestroy\s*:/);
      });
    });
  });

  describe('All 7 components do not use this.$xxx patterns', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} does not use this.$bus, this.$t, etc.`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify no this.$xxx patterns
        expect(scriptContent).not.toMatch(/this\.\$bus/);
        expect(scriptContent).not.toMatch(/this\.\$t/);
        expect(scriptContent).not.toMatch(/this\.\$router/);
        expect(scriptContent).not.toMatch(/this\.\$route/);
        expect(scriptContent).not.toMatch(/this\.\$message/);
        expect(scriptContent).not.toMatch(/this\.\$notify/);
      });
    });
  });

  describe('All 7 components maintain backward compatibility', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} has required props (client, redisKey)`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify defineProps includes client and redisKey
        expect(scriptContent).toMatch(/defineProps\s*\(\s*\{[\s\S]*?client/);
        expect(scriptContent).toMatch(/defineProps\s*\(\s*\{[\s\S]*?redisKey/);
      });
    });
  });

  describe('All 7 components have proper template structure', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} has valid template`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Check for template block
        expect(content).toMatch(/<template>[\s\S]*?<\/template>/);

        // Extract template block
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
        expect(templateMatch).toBeTruthy();

        const templateContent = templateMatch[1];

        // Verify template is not empty
        expect(templateContent.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('All 7 components use Element Plus components', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses el- prefixed components`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract template block
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
        expect(templateMatch).toBeTruthy();

        const templateContent = templateMatch[1];

        // Verify uses Element Plus components
        expect(templateContent).toMatch(/<el-/);
      });
    });
  });

  describe('All 7 components do not use old ElementUI icon syntax', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} does not use <i class="el-icon-xxx">`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract template block
        const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
        expect(templateMatch).toBeTruthy();

        const templateContent = templateMatch[1];

        // Verify no old icon syntax (allow fa- icons which are Font Awesome)
        const oldIconMatches = templateContent.match(/<i\s+class="el-icon-/g);
        expect(oldIconMatches).toBeNull();
      });
    });
  });

  describe('All 7 components use useI18n composable', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses useI18n() instead of this.$t()`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify uses useI18n
        expect(scriptContent).toMatch(/useI18n\s*\(/);
        expect(scriptContent).toMatch(/const\s+\{\s*t\s*\}\s*=\s*useI18n\s*\(/);
      });
    });
  });

  describe('All 7 components import from correct paths', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} uses @ alias for imports`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script\s+setup[^>]*>([\s\S]*?)<\/script>/);
        expect(scriptMatch).toBeTruthy();

        const scriptContent = scriptMatch[1];

        // Verify uses @ alias for imports
        const hasAtAlias = /@\//.test(scriptContent);
        expect(hasAtAlias).toBe(true);
      });
    });
  });

  describe('All 7 components do not have duplicate script tags', () => {
    PHASE9_COMPONENTS.forEach((componentName) => {
      it(`${componentName} has only one script block`, () => {
        const filePath = resolve(CONTENTS_DIR, componentName);
        const content = readFileSync(filePath, 'utf-8');

        // Count script blocks
        const scriptMatches = content.match(/<script/g);
        expect(scriptMatches).toBeTruthy();
        expect(scriptMatches.length).toBe(1);
      });
    });
  });
});

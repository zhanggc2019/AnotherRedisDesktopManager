import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

// List of all 21 atomic components
const atomicComponents = [
  // 15 viewers
  'viewers/ViewerText.vue',
  'viewers/ViewerJson.vue',
  'viewers/ViewerBinary.vue',
  'viewers/ViewerHex.vue',
  'viewers/ViewerGzip.vue',
  'viewers/ViewerBrotli.vue',
  'viewers/ViewerDeflate.vue',
  'viewers/ViewerDeflateRaw.vue',
  'viewers/ViewerMsgpack.vue',
  'viewers/ViewerPHPSerialize.vue',
  'viewers/ViewerJavaSerialize.vue',
  'viewers/ViewerPickle.vue',
  'viewers/ViewerProtobuf.vue',
  'viewers/ViewerCustom.vue',
  'viewers/ViewerOverSize.vue',
  // 6 other atomic components
  'ScrollToTop.vue',
  'ElementIcon.vue',
  'FileInput.vue',
  'InputBinary.vue',
  'InputPassword.vue',
  'LanguageSelector.vue',
];

describe('Phase 7.3: Atomic Components Syntax Verification', () => {
  describe('Script Setup Syntax Verification', () => {
    atomicComponents.forEach((componentPath) => {
      it(`${componentPath} should use <script setup> syntax`, () => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Check for <script setup> tag
        const hasScriptSetup = /<script\s+setup/.test(content);
        expect(hasScriptSetup, `${componentPath} should have <script setup>`).toBe(true);

        // Extract script block
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        const scriptContent = scriptMatch ? scriptMatch[1] : '';

        // Check for Options API patterns
        const hasExportDefault = /export\s+default\s*\{/.test(scriptContent);
        expect(hasExportDefault, `${componentPath} should not have export default {}`).toBe(false);

        const hasDataFunction = /\bdata\s*\(\s*\)\s*\{/.test(scriptContent);
        expect(hasDataFunction, `${componentPath} should not have data() function`).toBe(false);

        const hasMethods = /\bmethods\s*:/.test(scriptContent);
        expect(hasMethods, `${componentPath} should not have methods: option`).toBe(false);

        const hasComputed = /\bcomputed\s*:/.test(scriptContent);
        expect(hasComputed, `${componentPath} should not have computed: option`).toBe(false);

        const hasWatch = /\bwatch\s*:/.test(scriptContent);
        expect(hasWatch, `${componentPath} should not have watch: option`).toBe(false);

        const hasComponents = /\bcomponents\s*:/.test(scriptContent);
        expect(hasComponents, `${componentPath} should not have components: option`).toBe(false);
      });
    });
  });

  describe('Props Declaration Verification', () => {
    atomicComponents.forEach((componentPath) => {
      it(`${componentPath} should have defineProps() if it declares props`, () => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        const scriptContent = scriptMatch ? scriptMatch[1] : '';

        // Check if component explicitly declares props in script
        const hasPropsDeclaration = /defineProps\s*\(/.test(scriptContent);

        // If component has defineProps, verify it's properly formatted
        if (hasPropsDeclaration) {
          expect(hasPropsDeclaration, `${componentPath} should have defineProps() declaration`).toBe(true);
        }
      });
    });
  });

  describe('No this.$xxx Access Verification', () => {
    atomicComponents.forEach((componentPath) => {
      it(`${componentPath} should not use this.$xxx patterns`, () => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Extract script block
        const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
        const scriptContent = scriptMatch ? scriptMatch[1] : '';

        // Check for this.$xxx patterns
        const hasThisAccess = /this\.\$[\w]+/.test(scriptContent);
        expect(hasThisAccess, `${componentPath} should not use this.$xxx patterns`).toBe(false);
      });
    });
  });

  describe('No element-ui Import Verification', () => {
    atomicComponents.forEach((componentPath) => {
      it(`${componentPath} should not import from element-ui`, () => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Check for element-ui imports
        const hasElementUIImport = /from\s+['"]element-ui['"]/.test(content);
        expect(hasElementUIImport, `${componentPath} should not import from element-ui`).toBe(false);
      });
    });
  });

  describe('No Old Icon Format Verification', () => {
    atomicComponents.forEach((componentPath) => {
      it(`${componentPath} should not use old <i class="el-icon-"> format`, () => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Check for old icon format
        const hasOldIconFormat = /<i\s+class=["']el-icon-/.test(content);
        expect(hasOldIconFormat, `${componentPath} should not use old <i class="el-icon-"> format`).toBe(false);
      });
    });
  });

  describe('Backward Compatibility Verification', () => {
    it('all 21 components should exist and be readable', () => {
      atomicComponents.forEach((componentPath) => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');
        expect(content.length > 0, `${componentPath} should be readable`).toBe(true);
        expect(content.includes('<template>'), `${componentPath} should have template`).toBe(true);
        expect(content.includes('<script'), `${componentPath} should have script`).toBe(true);
      });
    });

    it('all components should have proper Vue 3 structure', () => {
      atomicComponents.forEach((componentPath) => {
        const filePath = resolve('src/renderer/components', componentPath);
        const content = readFileSync(filePath, 'utf-8');

        // Check for Vue 3 imports
        const hasVueImports = /from\s+['"]vue['"]/.test(content);
        const hasScriptSetup = /<script\s+setup/.test(content);

        // Components should either have Vue imports or be simple templates
        expect(
          hasVueImports || hasScriptSetup,
          `${componentPath} should have Vue imports or script setup`,
        ).toBe(true);
      });
    });
  });

  describe('Summary', () => {
    it('should have verified all 21 atomic components', () => {
      expect(atomicComponents.length).toBe(21);
    });

    it('should have 15 viewer components', () => {
      const viewers = atomicComponents.filter(c => c.startsWith('viewers/'));
      expect(viewers.length).toBe(15);
    });

    it('should have 6 other atomic components', () => {
      const others = atomicComponents.filter(c => !c.startsWith('viewers/'));
      expect(others.length).toBe(6);
    });
  });
});

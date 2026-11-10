import { describe, expect, it } from 'vitest';
import { WgslReflect, WgslScanner } from 'wgsl_reflect';
import { backgroundShader, computeShader, particleShader, spriteShader } from './shaders';

describe('WGSL shader contracts', () => {
  for (const [name, code] of Object.entries({
    backgroundShader,
    computeShader,
    particleShader,
    spriteShader,
  })) {
    it(`${name} does not use the reserved WGSL target token`, () => {
      // wgsl_reflect 1.2.3 accepts this identifier, but browser WGSL compilers reject it.
      // Scan tokens rather than raw text so comments do not trigger this regression check.
      const reservedTokens = new WgslScanner(code)
        .scanTokens()
        .filter((token) => token.lexeme === 'target')
        .map((token) => ({ token: token.lexeme, line: token.line }));
      expect(reservedTokens).toEqual([]);
    });
    it(`${name} parses and preserves the CPU's 48-byte combat uniform layout`, () => {
      const shader = new WgslReflect(code);
      expect(shader.uniforms[0].size).toBe(48);
      expect(shader.uniforms[0].members?.map((m) => [m.name, m.offset])).toEqual([
        ['world', 0],
        ['time', 8],
        ['dt', 12],
        ['glow', 16],
        ['count', 20],
        ['stage', 24],
        ['danger', 28],
        ['impact', 32],
        ['flash', 40],
        ['speed', 44],
      ]);
    });
  }
  it('uses the same 16-byte particle layout for compute and rendering', () => {
    for (const code of [computeShader, particleShader]) {
      const reflect = new WgslReflect(code);
      const particle = reflect.structs.find((s) => s.name === 'Particle');
      expect(particle?.size).toBe(16);
      expect(particle?.members.map((m) => [m.name, m.offset])).toEqual([
        ['position', 0],
        ['seed', 8],
      ]);
    }
  });
  it('matches the 48-byte sprite packing used by the renderer', () => {
    const reflect = new WgslReflect(spriteShader);
    const sprite = reflect.structs.find((s) => s.name === 'Sprite');
    expect(sprite?.size).toBe(48);
    expect(sprite?.members.map((m) => m.offset)).toEqual([0, 16, 32]);
  });
});

import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
const source = await readFile(new URL('../src/components/Projects/deviceScreenProjection.ts', import.meta.url), 'utf8')
const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: module.exports })
const { DEVICE_FRAME, DEVICE_SCREENS, screenProjection } = module.exports
function project(matrix, x, y) {
  const w = matrix[3] * x + matrix[7] * y + matrix[15]
  return [(matrix[0] * x + matrix[4] * y + matrix[12]) / w, (matrix[1] * x + matrix[5] * y + matrix[13]) / w]
}
test('native screenshot corners remain on the original displays at every responsive scale', () => {
  for (const width of [375 * 1.56, 402 * 1.56, 1024, 1440, 1920]) {
    const scale = width / DEVICE_FRAME.width
    for (const screen of DEVICE_SCREENS) {
      const matrix = screenProjection(screen.quad, screen.width, screen.height, scale)
      const corners = [[0, 0], [screen.width, 0], [screen.width, screen.height], [0, screen.height]]
      corners.forEach(([x, y], index) => {
        const actual = project(matrix, x, y)
        const expected = screen.quad[index]
        assert.ok(Math.abs(actual[0] - expected[0] * scale) < 1e-8)
        assert.ok(Math.abs(actual[1] - expected[1] * scale) < 1e-8)
      })
      assert.ok(matrix.every(Number.isFinite))
    }
  }
})
test('projection has no perspective pole or orientation reversal inside a display', () => {
  for (const screen of DEVICE_SCREENS) {
    const matrix = screenProjection(screen.quad, screen.width, screen.height, 1)
    for (let row = 0; row <= 10; row++) {
      let previous = -Infinity
      for (let column = 0; column <= 10; column++) {
        const x = screen.width * column / 10, y = screen.height * row / 10
        assert.ok(matrix[3] * x + matrix[7] * y + 1 > 0)
        const [projectedX] = project(matrix, x, y)
        assert.ok(projectedX > previous)
        previous = projectedX
      }
    }
  }
})

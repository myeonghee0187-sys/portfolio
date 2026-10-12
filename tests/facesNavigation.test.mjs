import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/Faces/facesNavigation.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const projects = [
  { id: 'tchaikim' },
  { id: 'jaduya' },
  { id: 'f45' },
]
const moduleSource = outputText.replace(
  /import \{ FACE_PROJECTS \} from ['"]\.\/facesData['"];?/,
  `const FACE_PROJECTS = ${JSON.stringify(projects)};`,
)
const { faceIndexById, faceTargetScroll, navigateToFaceWithRetries } = await import(
  `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`
)

test('project ids retain the FACE_PROJECTS order used by every navigation controller', () => {
  assert.equal(faceIndexById('tchaikim'), 0)
  assert.equal(faceIndexById('jaduya'), 1)
  assert.equal(faceIndexById('f45'), 2)
  assert.equal(faceIndexById('missing'), -1)
})

test('interactive targets invert entry hold and measured loop centers', () => {
  const start = 1000
  const hold = 450
  const distance = 2450
  const loop = 2000
  const centers = [0, 620, 1400]
  assert.equal(faceTargetScroll(0, start, hold, distance, loop, centers), 1225)
  assert.equal(faceTargetScroll(1, start, hold, distance, loop, centers), 2070)
  assert.equal(faceTargetScroll(2, start, hold, distance, loop, centers), 2850)
  assert.equal(faceTargetScroll(-1, start, hold, distance, loop, centers), null)
  assert.equal(faceTargetScroll(3, start, hold, distance, loop, centers), null)
})

test('unavailable readiness retries the same id against the currently mounted controller', async () => {
  const calls = []
  const first = {
    navigateToFace: async id => {
      calls.push(['first', id])
      return { status: 'unavailable', focusTarget: null }
    },
  }
  const replacement = {
    navigateToFace: async id => {
      calls.push(['replacement', id])
      return { status: 'ready', focusTarget: null }
    },
  }
  let current = first
  const result = await navigateToFaceWithRetries('jaduya', () => current, 3, async () => {
    current = replacement
  })
  assert.equal(result.status, 'ready')
  assert.deepEqual(calls, [['first', 'jaduya'], ['replacement', 'jaduya']])
})

test('exhausted readiness remains unavailable so the overlay can recover', async () => {
  const ids = []
  const controller = {
    navigateToFace: async id => {
      ids.push(id)
      return { status: 'unavailable', focusTarget: null }
    },
  }
  const result = await navigateToFaceWithRetries('f45', () => controller, 3)
  assert.equal(result.status, 'unavailable')
  assert.deepEqual(ids, ['f45', 'f45', 'f45'])
})

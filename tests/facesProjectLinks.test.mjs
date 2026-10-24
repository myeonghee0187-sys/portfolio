import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const compile = async path => ts.transpileModule(
  await readFile(new URL(path, import.meta.url), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText
const dataSource = await compile('../src/components/Faces/facesData.ts')
const railSource = await compile('../src/components/Faces/FacesRail.tsx')
const data = { exports: {} }
vm.runInNewContext(dataSource, { exports: data.exports, require: path => ({ default: path }) })
const projects = data.exports.FACE_PROJECTS
const tchaikimCaseStudyUrl = data.exports.TCHAIKIM_CASE_STUDY_URL

class Anchor {
  constructor(projectId) { this.dataset = { projectId } }
  closest() { return this }
}

// Execute the real rail's event handlers with a small hook/DOM adapter. Layout,
// video decoding, and native pointer capture remain browser-QA responsibilities.
function fixture({ withHandler = true, exitOnOpen = false } = {}) {
  const callbacks = new Map()
  const cleanups = []
  const opened = []
  const host = { scrollLeft: 0, dataset: {}, contains: node => node instanceof Anchor }
  const window = {
    addEventListener: (name, callback) => callbacks.set(name, callback),
    removeEventListener: name => callbacks.delete(name),
  }
  const jsx = (type, props) => ({ type, props })
  const imports = {
    react: {
      forwardRef: render => render,
      useCallback: callback => callback,
      useEffect: callback => { const cleanup = callback(); if (cleanup) cleanups.push(cleanup) },
      useImperativeHandle: () => {},
      useRef: value => ({ current: value }),
      useState: value => [value, () => {}],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '../../hooks/useMediaQuery': { default: () => false },
    './facesData': { FACE_PROJECTS: projects },
    './LoopVideo': { default: () => null },
    '../AllFaces/allFacesStore': { useAllFacesOpen: () => false },
    './facesNavigation': { faceIndexById: id => projects.findIndex(project => project.id === id) },
  }
  const exports = {}
  vm.runInNewContext(railSource, { exports, require: name => {
    assert.ok(name in imports, `Unexpected dependency: ${name}`)
    return imports[name]
  }, Element: Anchor, window })
  const onOpenProject = id => {
    opened.push(id)
    if (exitOnOpen) callbacks.get('portfolio-project-exit')({ detail: { projectId: id } })
  }
  const tree = exports.default({ onOpenProject: withHandler ? onOpenProject : undefined }, null)
  tree.props.ref.current = host
  const event = (overrides = {}) => ({
    target: new Anchor('tchaikim'), currentTarget: host,
    type: 'pointerdown', pointerId: 1, isPrimary: true, button: 0,
    clientX: 100, clientY: 100, detail: 1, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true }, ...overrides,
  })
  const down = overrides => tree.props.onPointerDownCapture(event(overrides))
  const move = overrides => tree.props.onPointerMoveCapture(event({ type: 'pointermove', ...overrides }))
  const up = overrides => tree.props.onPointerUpCapture(event({ type: 'pointerup', ...overrides }))
  const click = overrides => {
    const input = event({ type: 'click', ...overrides })
    tree.props.onClick(input)
    return input
  }
  return { tree, opened, host, down, move, up, click, event,
    cancel: () => tree.props.onPointerCancelCapture(event({ type: 'pointercancel' })),
    dispose: () => cleanups.forEach(cleanup => cleanup()), callbacks }
}

test('all three projects expose routes and their approved external links', () => {
  const [tchai, jaduya, f45] = projects
  assert.equal(tchai.detailPath, '/projects/tchaikim')
  assert.equal(tchai.liveUrl, 'https://myeonghee0187-sys.github.io/tchaikim_all/pages/main/index.html')
  assert.equal(tchaikimCaseStudyUrl, 'https://www.figma.com/deck/8K1OMzkKzmEmkV2Kejd43q/기획서-슬라이드?node-id=6242-19&viewport=-109%2C-41%2C0.52&t=gkQV04wKLDvypaXf-1&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1')
  assert.equal(tchai.caseStudyUrl, tchaikimCaseStudyUrl)
  assert.equal(jaduya.detailPath, '/projects/jaduya')
  assert.equal(jaduya.liveUrl, 'https://jaduya.vercel.app/')
  assert.equal(new URL(jaduya.caseStudyUrl).pathname.split('/')[2], '7l7yOTebIpNQ4Go31Mduar')
  assert.equal(f45.detailPath, '/projects/f45')
  assert.equal(f45.liveUrl, 'https://myeonghee0187-sys.github.io/f45_korea/')
  assert.equal(f45.caseStudyUrl, undefined)
})

test('tap dispatches once; synchronous parent exit prevents repeated activation', () => {
  const f = fixture({ exitOnOpen: true })
  f.down(); f.up()
  assert.equal(f.opened.length, 0, 'pointerup must not navigate')
  assert.equal(f.click().defaultPrevented, true)
  f.click({ detail: 0 })
  assert.deepEqual(f.opened, ['tchaikim'])
  assert.equal(f.host.dataset.exitingProject, 'tchaikim')
  f.dispose()
  assert.equal(f.callbacks.size, 0)
})

test('a swipe remains cancelled after returning to its origin and releasing', () => {
  const f = fixture()
  f.down(); f.move({ clientX: 140 }); f.move({ clientX: 100 }); f.up()
  assert.equal(f.click().defaultPrevented, true)
  assert.deepEqual(f.opened, [])
  f.down(); f.up(); f.click()
  assert.deepEqual(f.opened, ['tchaikim'], 'a fresh tap clears the previous gesture')
})

test('vertical movement, native rail scrolling, cancellation, and changed targets cannot navigate', () => {
  for (const interrupt of [
    f => f.move({ clientY: 130 }),
    f => { f.host.scrollLeft = 30 },
    f => f.cancel(),
    f => f.down({ target: new Anchor('jaduya') }),
  ]) {
    const f = fixture()
    f.down(); interrupt(f); f.up()
    assert.equal(f.click().defaultPrevented, true)
    assert.deepEqual(f.opened, [])
  }
})

test('keyboard activation works after a cancelled gesture; unknown projects stay unavailable', () => {
  const f = fixture()
  f.down(); f.cancel()
  assert.equal(f.click({ detail: 0 }).defaultPrevented, true)
  assert.deepEqual(f.opened, ['tchaikim'])
  assert.equal(f.click({ detail: 0, target: new Anchor('f45') }).defaultPrevented, true)
  assert.deepEqual(f.opened, ['tchaikim', 'f45'])
  assert.equal(f.click({ detail: 0, target: new Anchor('unavailable') }).defaultPrevented, true)
  assert.deepEqual(f.opened, ['tchaikim', 'f45'])
})

test('JADUYA taps dispatch the project id and share the exit lock', () => {
  const f = fixture({ exitOnOpen: true })
  f.down({ target: new Anchor('jaduya') }); f.up({ target: new Anchor('jaduya') })
  f.click({ target: new Anchor('jaduya') })
  f.click({ detail: 0, target: new Anchor('jaduya') })
  assert.deepEqual(f.opened, ['jaduya'])
  assert.equal(f.host.dataset.exitingProject, 'jaduya')
  f.dispose()
})

test('modified clicks and links without an SPA callback retain native navigation', () => {
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
    const f = fixture()
    f.down(); f.up()
    assert.equal(f.click({ [modifier]: true }).defaultPrevented, false)
    assert.deepEqual(f.opened, [])
  }
  const f = fixture({ withHandler: false })
  f.down(); f.up()
  assert.equal(f.click().defaultPrevented, false)
})

test('all three project videos and CTAs are separate semantic links', () => {
  const f = fixture()
  const slides = f.tree.props.children.map(element => element.type(element.props, null))
  for (const [index, path] of ['/projects/tchaikim', '/projects/jaduya', '/projects/f45'].entries()) {
    const [visual] = slides[index].props.children
    const [video, overlay] = visual.props.children
    assert.equal(video.type, 'a')
    assert.equal(video.props.href, path)
    const cta = overlay.props.children
    assert.equal(cta.type, 'a')
    assert.equal(cta.props.href, video.props.href)
  }
})

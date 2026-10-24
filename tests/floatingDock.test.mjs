import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/components/Projects/FloatingDock.tsx', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
})
const jsx = (type, props) => ({ type, props })
const module = { exports: {} }
vm.runInNewContext(outputText, {
  exports: module.exports,
  require: name => name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: Symbol('Fragment') } : {},
})
const FloatingDock = module.exports.default

test('a project without a case study renders only the existing live-site link', () => {
  const dock = FloatingDock({ liveUrl: 'https://live.example/' })
  assert.equal(dock.type, 'nav')
  assert.equal(dock.props.children.length, 2)
  assert.equal(dock.props.children[0].type, 'a')
  assert.equal(dock.props.children[0].props.href, 'https://live.example/')
  assert.equal(dock.props.children[1], undefined)
})

test('projects with a case study retain the divider and second link', () => {
  const dock = FloatingDock({ liveUrl: 'https://live.example/', caseStudyUrl: 'https://case.example/' })
  const caseStudyGroup = dock.props.children[1]
  assert.ok(caseStudyGroup)
  assert.equal(caseStudyGroup.props.children[0].props.className, 'floating-dock__divider')
  assert.equal(caseStudyGroup.props.children[1].type, 'a')
  assert.equal(caseStudyGroup.props.children[1].props.href, 'https://case.example/')
})

import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { URL } from 'node:url'
import ts from 'typescript'

const source = await readFile(new URL('../src/navigation/projectRouting.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
})
const { routeFromUrl, routeForHistory, TCHAIKIM_PATH, JADUYA_PATH, F45_PATH } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'))
const url = path => new URL(path, 'https://portfolio.example')

test('Vercel serves the SPA for every implemented direct detail URL and trailing slash', async () => {
  const hosting = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  for (const path of [TCHAIKIM_PATH, JADUYA_PATH, F45_PATH]) {
    for (const suffix of ['', '/']) {
      assert.ok(hosting.rewrites.some(rule => rule.source === path + suffix && rule.destination === '/index.html'), path + suffix)
    }
  }
})

test('direct detail URLs and explicit homepage sections resolve without fictitious project routes', () => {
  assert.equal(routeFromUrl(url('/projects/tchaikim'), 'a').page, 'tchaikim')
  assert.equal(routeFromUrl(url('/projects/tchaikim/'), 'a').page, 'tchaikim')
  assert.equal(routeFromUrl(url('/projects/jaduya'), 'a').page, 'jaduya')
  assert.equal(routeFromUrl(url('/projects/jaduya/'), 'a').page, 'jaduya')
  assert.equal(routeFromUrl(url('/projects/f45'), 'a').page, 'f45')
  assert.equal(routeFromUrl(url('/projects/f45/'), 'a').page, 'f45')
  assert.deepEqual(routeFromUrl(url('/?face=jaduya#faces'), 'b').destination, { section: 'faces', faceId: 'jaduya' })
  assert.deepEqual(routeFromUrl(url('/?face=tchaikim#faces'), 'b').destination, { section: 'faces', faceId: 'tchaikim' })
  assert.deepEqual(routeFromUrl(url('/#contact'), 'b').destination, { section: 'contact' })
  assert.equal(routeFromUrl(url('/'), 'b').destination, null)
  assert.equal(routeFromUrl(url('/projects/unavailable'), 'b'), null)
})

test('history restores the selected Face and detail reading position independently', () => {
  const home = routeForHistory(url('/'), { page: 'home', key: 'home', scrollY: 9000, destination: { section: 'faces', faceId: 'tchaikim' } }, 'fallback')
  assert.equal(home.key, 'home')
  assert.deepEqual(home.destination, { section: 'faces', faceId: 'tchaikim' })
  const detail = routeForHistory(url('/projects/tchaikim'), { page: 'tchaikim', key: 'detail', scrollY: 12400 }, 'fallback')
  assert.equal(detail.scrollY, 12400)
  assert.equal(detail.destination, null)
  const jaduya = routeForHistory(url('/projects/jaduya'), { page: 'jaduya', key: 'jaduya', scrollY: 1800 }, 'fallback')
  assert.equal(jaduya.key, 'jaduya')
  assert.equal(jaduya.scrollY, 1800)
  assert.equal(jaduya.destination, null)
  const f45 = routeForHistory(url('/projects/f45'), { page: 'f45', key: 'f45', scrollY: 2450 }, 'fallback')
  assert.equal(f45.key, 'f45')
  assert.equal(f45.scrollY, 2450)
  assert.equal(f45.destination, null)
  assert.equal(routeForHistory(url('/projects/jaduya'), detail, 'fresh').scrollY, 0, 'one detail must not inherit another project’s position')
  assert.equal(routeForHistory(url('/projects/f45'), jaduya, 'fresh').scrollY, 0, 'F45 must not inherit another project’s position')
})

test('unrelated history and invalid positions cannot override the current route', () => {
  assert.equal(routeForHistory(url('/projects/tchaikim'), { page: 'home', scrollY: 99 }, 'new').scrollY, 0)
  assert.equal(routeForHistory(url('/projects/tchaikim'), { page: 'tchaikim', scrollY: Infinity }, 'new').scrollY, 0)
  assert.equal(routeForHistory(url('/projects/tchaikim'), { page: 'tchaikim', scrollY: -4 }, 'new').scrollY, 0)
  assert.deepEqual(routeForHistory(url('/#contact'), null, 'new').destination, { section: 'contact' })
})

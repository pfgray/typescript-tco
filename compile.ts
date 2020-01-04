import * as ts from 'typescript'

import { highlight } from 'cli-highlight'
import { transformer } from './transformer'
import * as path from 'path'
import * as fs from 'fs'

const program = ts.createProgram(['./index.ts'], {})
const source = program.getSourceFile('./index.ts')

if (source) {
  const result = ts.transform(source, [transformer(program)])

  console.log('/** Transforming: **/')
  console.log(
    highlight(ts.createPrinter().printFile(source), {
      language: 'typescript',
    }),
  )
  console.log('/** Into: **/')
  const transformed = ts.createPrinter().printFile(result.transformed[0])
  console.log(
    highlight(transformed, {
      language: 'typescript',
    }),
  )
  console.log('/****/')
  fs.writeFile(path.join('dist', 'index.ts'), transformed, () => {})
}

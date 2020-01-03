import * as ts from 'typescript'
import * as O  from 'fp-ts/lib/Option'
import * as A from 'fp-ts/lib/Array'
import { pipe } from 'fp-ts/lib/pipeable'
import { ADT } from 'ts-adt'

// type Param = ADT<{
//   normal: { name: ts.Identifier },
//   array: { values: { name: ts.Identifier, index: number}[] } ,
//   object: { attrs: { name: ts.Identifier, rename: ts.Identifier }[]}
// }>

export const transformer: (<T extends ts.Node>(program: ts.Program) => ts.TransformerFactory<T>) = program => context => {
  const visit: ts.Visitor = node => {
    if(ts.isFunctionDeclaration(node) && node.name && node.body && node.name.text === 'tailFac_') {
      return convert(node, node.parameters.map(a => a), node.body, context)
      // console.log('checking function:', node.name.text)

      // console.log('found params:', node.parameters.map(dereferenceParam).join('|'))
      // console.log('statements:')
      // node.body.statements.forEach(s => {
      //   console.log('*********')
      //   if(ts.isReturnStatement(s)) {
      //     //console.log('ret:', s.getFullText())
      //   }
      
      // })
      // console.log('*********')
      
    } else {
      //console.log('not a function declaration!') //, node.getText())
    }
    
    return ts.visitEachChild(node, child => visit(child), context);
  }
  return n => ts.visitNode(n, visit);
}

function convert(func: ts.FunctionDeclaration, parameters: ts.ParameterDeclaration[], block: ts.Block, context: ts.TransformationContext): ts.Node {
  const paramIdentifiers = pipe(
    parameters,
    A.chain(dereferenceParam)
  )

  const newParamIdentifiers = paramIdentifiers.map(
    id => [id, ts.createUniqueName(id.text)]
  )

  const initializations = newParamIdentifiers.map(([id, newId]) => {
    // ts.createIdentifier
    return ts.createVariableDeclaration(newId, undefined, id)
  })

  const replaceIdentifiers: (node: ts.Node) => ts.VisitResult<ts.Node> = node => {
    if(ts.isIdentifier(node)) {
      return pipe(
        newParamIdentifiers,
        A.findFirst(([id]) => id.text === node.text),
        O.fold(() => node, ([id, newId]) => newId)
      )
    } else {
      return ts.visitEachChild(node, child => replaceIdentifiers(child), context)
    }
  }
  const newBlock = ts.visitEachChild(block, child => replaceIdentifiers(child), context)

  const replaceRecursion: (node: ts.Node) => ts.VisitResult<ts.Node> = node => {
    if(ts.isReturnStatement(node) && node.expression) {
      const ce = node.expression
      if(ts.isCallExpression(ce)) {
        if(ts.isIdentifier(ce.expression) && func.name && ce.expression.text === func.name.text) {
          const tempArgs = ce.arguments.map((_, i) => ts.createUniqueName(paramIdentifiers[i].text))
          // for each argument, make a statement which is a reassignment
          // todo: I think we need temp variables??
          const updates = ce.arguments.map((arg, i) => {
            return ts.createStatement(ts.createAssignment(tempArgs[i], arg))
          });
          const commits = tempArgs.map((tempArg, i) => {
            return ts.createStatement(ts.createAssignment(newParamIdentifiers[i][1], tempArg))
          })
          // const assignments = ce.arguments.map
          return ts.createBlock([...updates, ...commits]);
        }
      }
    }
    return ts.visitEachChild(node, child => replaceRecursion(child), context);
  }
  const newerBlock = ts.visitEachChild(newBlock, child => replaceRecursion(child), context)
  
  return ts.updateFunctionDeclaration(
    func,
    func.decorators,
    func.modifiers,
    func.asteriskToken,
    func.name,
    func.typeParameters,
    func.parameters,
    func.type,
    ts.createBlock([
      ts.createVariableStatement(
        undefined,
        ts.createVariableDeclarationList(initializations, ts.NodeFlags.Let)
      ),
      ts.createDo(newerBlock, ts.createLiteral(true)),
    ], true)
  )
}

function dereferenceParam(p: ts.ParameterDeclaration): ts.Identifier[] {
  if(ts.isIdentifier(p.name)) {
    return [p.name]
  } else {
    throw new Error("why are you doing fancy parameter stuff")
  }
}

// export const fromJSON = <T extends object>(json: any) => <K extends keyof T>(key: K, initial?: Partial<T>) => {
//   const value = json[key]
//   const isExists = value !== null && value !== undefined

//   return isExists ? value : initial ? initial : undefined
// }

// type Image = {
//   src: string,
//   href: string
// }

// fromJSON<Image>(5)('href')
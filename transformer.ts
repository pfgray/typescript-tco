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
    }
    return ts.visitEachChild(node, child => visit(child), context);
  }
  return n => ts.visitNode(n, visit);
}

function convert(
  func: ts.FunctionDeclaration,
  parameters: ts.ParameterDeclaration[],
  body: ts.Block,
  context: ts.TransformationContext
): ts.Node {
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
  const newBody = ts.visitEachChild(body, child => replaceIdentifiers(child), context)

  const replaceRecursion: (node: ts.Node) => ts.VisitResult<ts.Node> = node => {
    if(ts.isReturnStatement(node) && node.expression) {
      const ce = node.expression
      if(ts.isCallExpression(ce)) {
        if(ts.isIdentifier(ce.expression) && func.name && ce.expression.text === func.name.text) {
          const tempArgs = ce.arguments.map((_, i) => ts.createUniqueName(paramIdentifiers[i].text))
          // for each argument, make a statement which is a reassignment
          const tempArgInitializations = ce.arguments.map((arg, i) => {
            return ts.createVariableDeclaration(tempArgs[i], undefined, arg)
          });

          const tempArgVariables = ts.createVariableStatement(
            undefined,
            ts.createVariableDeclarationList(tempArgInitializations, ts.NodeFlags.Let)
          );

          const commits = tempArgs.map((tempArg, i) => {
            return ts.createStatement(ts.createAssignment(newParamIdentifiers[i][1], tempArg))
          })
          return ts.createBlock([tempArgVariables, ...commits]);
        }
      }
    }
    return ts.visitEachChild(node, child => replaceRecursion(child), context);
  }
  const newerBody = ts.visitEachChild(newBody, child => replaceRecursion(child), context)
  
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
      ts.createDo(newerBody, ts.createLiteral(true)),
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

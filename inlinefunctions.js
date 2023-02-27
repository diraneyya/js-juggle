function inlinefunctions(babel) {
  const { types: t, template } = babel;

  // A dictionary of keys/values where keys are the
  // function names (identifier) and the values are
  // objects containing the following properties:
  // - params: an array of the function params (ast)
  // - expression: the return expression (ast)
  // - node: the variable declaration node (ast)
  let functionCache = {};

  return {
    visitor: {
      "Program|BlockStatement": {
        exit(path) {
          for (const id in path.scope.bindings) {
            const binding = path.scope.bindings[id];
            if (binding.referenced) {
              const paths = binding.referencePaths;
              for (let i = 0; i < paths.length; i++) {
                const path = paths[i];
                if (path.parent.type === "CallExpression") {
                  const name = { ...path.parent.callee }.name;
                  if (functionCache[name]) {
                    const cachedExpression = functionCache[name].expression;
                    const cachedParams = functionCache[name].params;
                    const passedArguments = path.parent.arguments;
                    const assignments = [];
                    for (let j = 0; j < passedArguments.length; j++) {
                      if (j >= cachedParams.length) break;
                      const assignment = Babel.transform("let param = argument", {
                        ast: true,
                        code: false,
                      }).ast;
                      assignment.program.body[0].declarations[0].id =
                        cachedParams[j];
                      assignment.program.body[0].declarations[0].init =
                        passedArguments[j];
                      assignments.push(assignment);
                    }

                    path.parentPath.replaceWith(cachedExpression);
                    path.parentPath.traverse(
                      {
                        Identifier(path) {
                          for (let i = 0; i < this.params.length; i++) {
                            if (path.node.name === this.params[i].name) {
                              if (this.args[i]) {
                                path.replaceWith(this.args[i]);
                                let temp = path;
                                while (temp.parentPath.type === "MemberExpression")
                                  temp = temp.parentPath;
                                
                                // evaluate this temp node
                                try {
                                  const interpreter = new Sval();
                                  const argEval = temp.toString()
                                    .replaceAll(/[\n\t ]+/g, ' ');
                                  const argValue = interpreter.run(`
                                    exports.d = ${argEval};`);
                                  if (typeof interpreter.exports.d === 'undefined')
                                    throw Error("undefined expression");

                                  console.error(interpreter.exports.d);
                                  const replNode = template.expression.ast(
                                    JSON.stringify(interpreter.exports.d));
                                  console.group(path.node.name);
                                  console.info(`parameter "${path.node.name}" evaluated to ${JSON.stringify(interpreter.exports.d)} using:`);
                                  console.info(argEval);
                                  console.groupEnd();
                                  temp.replaceWith(replNode);
                                } catch {
                                  // replace with undefined
                                  temp.replaceWithSourceString("undefined");
                                }

                                temp.skip(); // don't recurse
                              } else {
                                let temp = path;
                                while (temp.parentPath.type === "MemberExpression")
                                  temp = temp.parentPath;

                                temp.replaceWithSourceString("undefined");
                              }
                            } else {
                              // attempt to evaluate
                              for (let k = 0; k < assignments.length; k++) {
                                try {
                                  const argEval = Babel.transformFromAst(
                                    assignments[k], "", {
                                      ast: false,
                                      code: true,
                                    }).code.replaceAll(/[\n\t ]+/g, ' ');
                                  const interpreter = new Sval({});
                                  interpreter.run(argEval); 
                                  interpreter.run(`exports.g1 = globalThis.hasOwnProperty("${path.node.name}")`);
                                  interpreter.run(`exports.g2 = globalThis["${path.node.name}"] === ${path.node.name}`);
                                  if (interpreter.exports.g1 && interpreter.exports.g2)
                                    continue;
                                  interpreter.run('exports.t = typeof ' + path.node.name);
                                  interpreter.run('exports.d = ' + path.node.name);
                                  if (interpreter.exports.t === 'undefined')
                                    continue;
                                  const replNode = template.expression.ast(
                                    JSON.stringify(interpreter.exports.d));
                                  console.group(path.node.name);
                                  console.info(`param "${path.node.name}" evaluated to "${interpreter.exports.d}" using:`);
                                  console.info(argEval);
                                  console.groupEnd();
                                  path.replaceWith(replNode);

                                  break;
                                } catch {
                                  // do nothing
                                  continue ;
                                }
                              }
                            }
                          }
                        },
                      },
                      {
                        args: passedArguments,
                        params: cachedParams,
                      }
                    );

                    // assignments.forEach(assignment => {
                    //   path.parentPath.parentPath.insertBefore(
                    //     assignment.program.body[0]);
                    // });
                  }
                }
              }
            }
          }

          // remove all cached functions from code
          if (path.type === "Program") {
            for (const id in functionCache) {
              functionCache[id].node.remove();
            }
          }
        },
      },

      // add functions to cache after exiting
      ArrowFunctionExpression: {
        exit(path) {
          // log the path in the console
          // console.dir(path);
          if (
            path.parent.type === "VariableDeclarator" &&
            path.node.body.type !== "BlockStatement"
          ) {
            const functionName = path.parent.id.name;
            const functionParams = path.node.params;
            const returnExpression = path.node.body;

            functionCache[functionName] = {
              params: functionParams,
              expression: returnExpression,
              node: path.parentPath,
            };
          }
        },
      },
    },
  };
}

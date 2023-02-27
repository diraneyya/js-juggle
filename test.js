// import parser from "@babel/parser";
// import { transformFromAstSync } from "@babel/core";
// import generate from "@babel/generator";

const { transform, transformFromAst } = Babel;

Babel.registerPlugin("inlinefunctions", inlinefunctions);

function transformCode(sourcecode, 
  t, setError, clearError, doInline = false) {

  try {
    let { ast } = transform(sourcecode, {
      plugins: ["syntax-jsx"],
      ast: true,
      code: false,
    });
  
    if (doInline === true) {
      ({ ast } = transformFromAst(ast, sourcecode, {
        plugins: ["inlinefunctions"],
        ast: true,
        code: false,
      }));
    }
  
    const { code } = transformFromAst(ast, sourcecode, {
      ast: false,
      code: true,
    });
  
    t(code);
    clearError();
  }
  catch (error) {
    t(`// ERROR OCCURED! ${Date.now()}`);
    setError();
    
    throw error;
  }
}
globalThis.transformCode = transformCode;

function buttonHandler() {
   transformCode(document.querySelector("#code").value,
      t => document.querySelector("#transformed").value = t,
      () => document.querySelector("#code").classList.add("error"),
      () => document.querySelector("#code").classList.remove("error"),
      document.querySelector("#inlinefunctions").checked);
}

window.onload = buttonHandler;
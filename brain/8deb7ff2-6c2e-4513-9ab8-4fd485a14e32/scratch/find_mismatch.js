const fs = require('fs');
const content = fs.readFileSync('d:/.mine/manager/web/app/page.tsx', 'utf8');

let stack = [];
let lineNum = 1;
let inString = null;
let escape = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\n') {
    lineNum++;
  }

  if (inString) {
    if (escape) {
      escape = false;
    } else if (char === '\\') {
      escape = true;
    } else if (char === inString) {
      inString = null;
    }
    continue;
  }

  // Handle strings
  if (char === '"' || char === "'" || char === '`') {
    inString = char;
    continue;
  }

  // Handle comments
  if (char === '/' && content[i+1] === '/') {
    i++;
    while (i < content.length && content[i] !== '\n') {
      i++;
    }
    lineNum++;
    continue;
  }
  if (char === '/' && content[i+1] === '*') {
    i += 2;
    while (i < content.length && !(content[i] === '*' && content[i+1] === '/')) {
      if (content[i] === '\n') lineNum++;
      i++;
    }
    i++;
    continue;
  }

  // Handle regex literals (heuristic: if we see / and the previous non-whitespace char is one of = , ( : ? [ + - * & | !
  // we treat it as regex)
  if (char === '/') {
    // Check if it's a regex literal
    let prevIndex = i - 1;
    while (prevIndex >= 0 && /\s/.test(content[prevIndex])) {
      prevIndex--;
    }
    const prevChar = content[prevIndex];
    const isRegex = prevIndex < 0 || '=,(?:[+-*&|!'.includes(prevChar) || (prevChar === 'e' && content.substring(prevIndex-5, prevIndex+1) === 'return');
    if (isRegex) {
      i++;
      let inRegexClass = false;
      while (i < content.length && (inRegexClass || content[i] !== '/')) {
        if (content[i] === '\\') {
          i += 2;
          continue;
        }
        if (content[i] === '[') inRegexClass = true;
        if (content[i] === ']') inRegexClass = false;
        if (content[i] === '\n') lineNum++;
        i++;
      }
      continue;
    }
  }

  if (char === '{' || char === '(' || char === '[') {
    stack.push({ char, lineNum });
  } else if (char === '}') {
    const top = stack.pop();
    if (!top || top.char !== '{') {
      console.log(`Mismatch: got } at line ${lineNum}, but top of stack was ${top ? top.char : 'empty'} (opened at line ${top ? top.lineNum : 'N/A'})`);
    }
  } else if (char === ')') {
    const top = stack.pop();
    if (!top || top.char !== '(') {
      console.log(`Mismatch: got ) at line ${lineNum}, but top of stack was ${top ? top.char : 'empty'} (opened at line ${top ? top.lineNum : 'N/A'})`);
    }
  } else if (char === ']') {
    const top = stack.pop();
    if (!top || top.char !== '[') {
      console.log(`Mismatch: got ] at line ${lineNum}, but top of stack was ${top ? top.char : 'empty'} (opened at line ${top ? top.lineNum : 'N/A'})`);
    }
  }
}

console.log('Unclosed brackets in stack at end:');
stack.forEach(item => {
  console.log(`Unclosed ${item.char} opened at line ${item.lineNum}`);
});

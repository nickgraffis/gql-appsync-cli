const fs = require('fs')

var codes = {
  bom: '\uFEFF',
  carriage: '\r'.charCodeAt(),
  colon: ':'.charCodeAt(),
  comma: ','.charCodeAt(),
  comment: '#'.charCodeAt(),
  directive: '@'.charCodeAt(),
  required: '!'.charCodeAt(),
  leftBrace: '{'.charCodeAt(),
  leftParen: '('.charCodeAt(),
  leftBracket: '['.charCodeAt(),
  newline: '\n'.charCodeAt(),
  rightBrace: '}'.charCodeAt(),
  rightParen: ')'.charCodeAt(),
  rightBracket: ']'.charCodeAt(),
  zero: '0'.charCodeAt(),
  quote: '"'.charCodeAt(),
}

var strings = {
  float: 'Float',
  int: 'Int',
  spread: '...',
  string: 'String',
  type: 'type'
}

let mostRecentToken = null

function tokenize(char) {

}

function graphqlTokenizer (input) {

  var current = 0
  var tokens = []
  let map = {}
  var str = ''
  var char
  var tokenIndex = 0
  while (current < input.length) {
    char = input[current]

    if (isWhitespace(char) || char === codes.comma || char === codes.bom) {
      current++
      continue
    }

    if (char === codes.leftBrace) {
      while(char !== codes.rightBrace) {
        char = input[++current]
        str += char
      }
      tokenIndex++ 
      tokens.push({
        var: tokens[tokenIndex - 3].value,
        value: str
      })

      continue
    }

    if (char === codes.rightBrace) {
      tokenIndex++
      tokens.push({ type: 'rightBrace', value: '}' })
      current++
      continue
    }

    if (char === codes.directive) {
      char = input[++current]
      while(isCharacter(char)) {
        str += String.fromCharCode(char)
        char = input[++current]
      }
      tokenIndex++
      tokens.push({ type: 'directiveName', value: str })
      mostRecentToken = 'directiveName'
      str = ''
      continue
    }

    if (char === codes.required) {
      tokenIndex++
      tokens.push({ type: 'required', value: '!' })
      current++
      continue
    }

    if (char === codes.leftParen) {
      if (mostRecentToken === 'directiveName') {
        while(char !== codes.rightParen) {
          str += String.fromCharCode(char)
          char = input[++current]
        }
        tokenIndex++
        tokens.push({ type: 'directiveArgs', value: str })
        mostRecentToken = 'directiveArgs'
        str = ''
        continue
      } else {
        tokenIndex++ 
        tokens.push({ type: 'leftParen', value: '(' })
        mostRecentToken = 'leftParen'
        current++
        continue
      }
    }

    if (char === codes.rightParen) {
      tokenIndex++ 
      tokens.push({ type: 'rightParen', value: ')' })
      current++
      continue
    }

    if (char === codes.leftBracket) {
      tokenIndex++
      tokens.push({ type: 'leftBracket', value: '[' })
      current++
      continue
    }

    if (char === codes.rightBracket) {
      tokenIndex++ 
      tokens.push({ type: 'rightBracket', value: ']' })
      current++
      continue
    }

    if (char === codes.colon) {
      tokenIndex++ 
      tokens.push({ type: 'colon', value: ':' })
      current++
      continue
    }

    if (char === codes.quote) {
      tokenIndex++ 
      tokens.push({ type: 'quote', value: '"' })
      current++
      continue
    }

    // comments
    if (char === codes.comment) {
      while (char !== codes.newline && char !== codes.carriage) {
        str += String.fromCharCode(char)
        char = input[++current]
      }
      tokenIndex++ 
      tokens.push({ type: 'comment', value: str })
      str = ''
      continue
    }

    // read keywords
    if (isString(char)) {
      while (isCharacter(char)) {
        str += String.fromCharCode(char)
        char = input[++current]
      }
      if (str === strings.float) {
        tokenIndex++ 
        tokens.push({ type: 'Name', id: 'float', value: str })
      } else if (str === strings.int) {
        tokenIndex++ 
        tokens.push({ type: 'Name', id: 'int', value: str })
      } else if (str === strings.type) {
        tokenIndex++ 
        tokens.push({ type: 'Name', id: 'type', value: str })
      } else if (str === strings.id) {
        tokenIndex++ 
        tokens.push({ type: 'Name', id: 'type', value: str })
      } else {
        tokenIndex++ 
        tokens.push({ type: 'Name', id: 'string', value: str })
      }
      str = ''
      continue
    }

    if (isNumber(char)) {
      while (isNumber(char)) {
        if (str === '0') throw new Error('Invalid number, unexpected digit after 0')
        str += String.fromCharCode(char)
        char = input[++current]
      }
      str = ''
      continue
    }

    throw new Error(String.fromCharCode(char) + ' is not a valid character. Code: ' + char)
  }

  return tokens
}

function isCharacter (char) {
  return (char >= 65 && char <= 90) || // A-Z
    char === 95 ||                     // _
    (char >= 97 && char <= 122) ||     // a-z
    char === 45 ||                     // -
    (char >= 48 && char <= 57)         // 0-9
}

function isNumber (char) {
  return char >= 48 && char <= 57      // 0-9
}

function isString (char) {
  return (char >= 65 && char <= 90) || // A-Z
    (char >= 97 && char <= 122)        // a-z
}

function isWhitespace (b) {
  return b === 0x20 || b === 0x09 || b === 0x0A || b === 0x0C || b === 0x0D
}

console.log(graphqlTokenizer(Buffer.from(fs.readFileSync('base.schema.graphql', 'utf-8'))))
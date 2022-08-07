import deepmerge from "deepmerge"
import fs from "fs"

let schama = fs.readFileSync('base.schema.graphql', 'utf-8')

let regexSections = new RegExp(`(?<type>(.*)?\\{(?<fields>(.|\n)*?\\}))`, 'g')

let sections = schama.match(regexSections)

let regexPresection = new RegExp(`(?<type>(.*)?\\{)(?<fields>(.|\n)*?\\})`)
let globalTypes = {}
for (let i = 0; i < sections.length; i++) {
  let result = sections[i].match(regexPresection)
  let _type = result?.groups?.type.replace('{', '').trim()
  let _fields = result?.groups?.fields.replace('}', '').trim()
  let type;
  let variable;
  if (_type === 'schema') {
    type = 'schema'
    variable = false
  } else {
    type = _type.split(' ')[1]
    variable = _type.split(' ')[0]
  }
  if (variable === '#') continue
  let fieldsArray = parseFields(_fields)
  let types = {}
  types[type] = {
    variable,
    fields: {}
  }
  for (let i = 0; i < fieldsArray.length; i++) {
    if (fieldsArray[i].includes('#')) continue 
    let _field = fieldsArray[i].match(new RegExp(`(?<field>.*?(\\(|\\:))(?<args>(.|\n)*?\\):)?(?<type>(.)*?(@|\n|$))?(?<directives>(.|\n)*?(\\)|$))?`));
    let fn = _field?.groups?.field.replace(/[^a-z0-9]/gi, '')
    if (!_field?.groups) continue
    let args = _field?.groups?.args?.replace(')', '').replace(/\n/gi, '').split(',').reduce((acc, curr) => {
      let arg = curr.split(':')
      acc[arg[0].trim()] = arg[1].trim()
      return acc
    } ,{})
    let directives = _field?.groups?.directives?.replace(')', '')
      .replace(/\n/gi, '')
      .split('@')
      .map(dd => dd.trim())
      .filter(Boolean)
      .map(dd => {
        let title = dd.split('(')[0]
        let obj = {
          title,
          args: dd.split('(')?.[1]?.replace(')', '').split(',').reduce((acc, curr) => {
            let arg = curr.split(':')
            acc[arg[0].trim()] = arg[1].trim()
            return acc
          },{})
        }
        return obj
      })
    // turn directive array into object with title and args
    directives = directives?.reduce((acc, curr) => {
      acc[curr.title] = curr.args || true
      return acc
    } ,{})
    types[type].fields[fn] = {
      return: _field?.groups?.type.replace('@', '').trim(),
      args,
      ...(!isEmptyObject(directives)) && { directives: directives }
    }
  }
  globalTypes = deepmerge(globalTypes, types)
}

function isEmptyObject(obj) {
  if (!obj) return true
  return Object.keys(obj).length === 0 && obj.constructor === Object
}

fs.writeFileSync('types.json', JSON.stringify(globalTypes, null, 2))

function isCharacter(char) {
  return char.match(/[a-zA-Z]/)
}

function isAnyWhiteSpace(char) {
  //any whitespace including newline
  return char.match(/\s/)
}

function parseFields(fields) {
  let foundLeftParen = false
  let foundRightParen = false
  let foundColon = false
  let foundAt = false
  let foundNewLine = false
  let splitPoints = []
  let arr = fields.split('')
  for (let i = 0; i < arr.length; i++) {
    let char = arr[i]
    if (char === '(') {
      foundNewLine = false
      foundLeftParen = true
    } else if (char === ')') {
      foundNewLine = false
      foundRightParen = true
    } else if (char === ':') {
      foundColon = true
    } else if (char === '@') {
      foundNewLine = false
      foundAt = true
    } else if (char === '\n') {
      foundNewLine = true
    } else if (char === '#') {
      splitPoints.push(i)
      while (arr[i] !== '\n' && i < arr.length) {
        i++
      }
      splitPoints.push(i)
    } else if (isCharacter(char)) {
      if (!foundLeftParen && !foundAt && foundColon && foundNewLine) {
        splitPoints.push(i)
        foundLeftParen = false
        foundRightParen = false
        foundColon = false
        foundAt = false
        foundNewLine = false
      } else if (foundAt && foundNewLine && foundColon && !foundLeftParen) {
        splitPoints.push(i)
        foundLeftParen = false
        foundRightParen = false
        foundColon = false
        foundAt = false
        foundNewLine = false
      } else if (foundLeftParen && foundRightParen && foundColon && !foundAt && foundNewLine) {
        splitPoints.push(i)
        foundLeftParen = false
        foundRightParen = false
        foundColon = false
        foundAt = false
        foundNewLine = false
      } else if (foundLeftParen && foundRightParen && foundColon && foundAt && foundNewLine) {
        splitPoints.push(i)
        foundLeftParen = false
        foundRightParen = false
        foundColon = false
        foundAt = false
        foundNewLine = false
      }
    }
  }
  let fieldsArr = []
  let start = 0
  for (let i = 0; i < splitPoints.length + 1; i++) {
    let end = splitPoints[i]
    let field = fields.substring(start, end)
    fieldsArr.push(field)
    start = end
  }
  return fieldsArr
}

// function parseFields(fields) {
//   let arr = fields.split('')
//   let ret
//   let field = []
//   let args = []
//   let type = []
//   let fieldIndex = 0
//   let argIndex = -1
//   let typeIndex = -1
//   let directiveIndex = -1
//   let directives = []
//   let lookingForFieldName = true
//   let lookingForReturnType = false
//   let lookingForArgs = false
//   let lookingForDirectives = false
//   let lookingForDirectiveArgs = false
//   while(arr.length > 0) {
//     console.log('char', arr[0])
//     // if character is any whitespace, skip it
//     if (isAnyWhiteSpace(arr[0])) {
//       arr.shift()
//       continue
//     }
//     // while looking for args, any char gets added to args
//     if (lookingForArgs) {
//       args += arr.shift()
//       continue
//     }
//     // while looking for directive args, any char gets added to direvtives
//     if (lookingForDirectiveArgs) {
//       directives[directiveIndex + 1] += arr.shift()
//       // if we reach a ')', we are done looking for args
//       if (arr[0] === ')') {
//         lookingForDirectiveArgs = false
//         lookingForDirectives = false
//       }
//       continue
//     }
//     if (lookingForDirectives) {
//       //if it is a character, add to directives
//       if (isCharacter(arr.shift())) {
//         directives[directiveIndex] += arr.shift()
//       }
//       // if it is a '(', we are looking for directive args
//       if (arr.shift() === '(') {
//         lookingForDirectiveArgs = true
//       }
//       continue
//     }

//     // if it is a character we are still looking for a field name
//     if (isCharacter(arr[0]) || arr[0] === ']' || arr[0] === '[' || arr[0] === '!') {
//       if (lookingForFieldName) {
//         field[fieldIndex] += arr.shift()
//       } else if (lookingForReturnType) {
//         type[typeIndex] += arr.shift()
//       } else {
//         lookingForFieldName = true
//         fieldIndex++
//         field[fieldIndex] += arr.shift()
//       }
//       continue
//     }
//     // if lookingForFieldName is still active, and we see a :, we are looking at a return type
//     if (lookingForFieldName && arr[0] === ':') {
//       lookingForFieldName = false
//       lookingForReturnType = true
//       typeIndex++
//       continue
//     }

//     // if lookingForFieldName is still active, and we see a (, we are looking at an argument
//     if (lookingForFieldName && arr[0] === '(') {
//       lookingForFieldName = false
//       lookingForArgs = true
//       argIndex++
//       continue
//     }
//     // if lookingForArgs is active, and we see a ), we are done looking at arguments
//     if (lookingForArgs && arr[0] === ')') {
//       lookingForArgs = false
//       continue
//     }

//     // if we are lookingFor a return type and we see a @, we are looking at a directive
//     if (lookingForReturnType && arr[0] === '@') {
//       lookingForReturnType = false
//       lookingForDirectives = true
//       directiveIndex++
//       continue
//     }
//     arr.shift()
//   }
//   ret = {
//     field,
//     args,
//     type,
//     directives
//   }
//   return ret
// }
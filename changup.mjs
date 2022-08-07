import fs from "fs"

let schama = fs.readFileSync('base.schema.graphql', 'utf-8')

let workingOnKeyword = false
let keywordStart = /[a-zA-Z]/
let keywordEnd = ' '
let workingOnVariableName = false
let variableNameStart = /[a-zA-Z]/
let variableNameEnd = '{'
let workingOnFieldName = false
let fieldNameStart = /[a-zA-Z]/
let fieldNameEnd = /\(|\:/
let workingOnFieldArgs = false
let fieldArgsStart = /\(/
let fieldArgsEnd = /\)/
let workingOnFieldType = false
let fieldTypeStart = /\:/
let fieldTypeEnd = /\@|\n/
let workingOnDirectiveName = false
let directiveNameStart = /\@/
let directiveNameEnd = /\(/
let workingOnDirectiveArgs = false
let directiveArgsStart = /\(/
let directiveArgsEnd = /\)/
let tokenMap = {}
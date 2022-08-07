import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import deepMerge from 'deepmerge';
import { parse, stringify } from 'yaml'
import inquirer from 'inquirer';
import { parseFields } from './utils.mjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

Array.prototype.asyncForEach = async function (callback) {
  for (let i = 0; i < this.length; i++) {
    await callback(this[i]);
  }
}

// List of directives to ignore
const awsDirectives = [
  'model',
  'auth',
  'key',
  'connection',
  'function',
  'http',
  'predictions',
  'searchable',
  'versioned',
  'aws_*'
]

async function go() {
  // Get all the files that end in .schema.graphql
  const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.schema.graphql'));

  let globalTypes = {}
  // Parse through each file for all of the types
  await files.asyncForEach(async (file) => {
    let schema = fs.readFileSync(`${__dirname}/${file}`, 'utf8');
    schema = schema.replace(/\n/g, 'NN');
    let types = {}
    // first we need the types and, if present their directive and directive arguments
    schema.match(/type\s+(\w+)/g).forEach(type => {
      types[type.split(' ')[1]] = {}
    })

    // for each type see if it has a directive and if so, get the name and arguments
    await Object.keys(types).asyncForEach(async (type) => {
      // remove the name of the directive from type ${type} @(directiveName)(arguments)
      let directive = schema.match(new RegExp(`type ${type}\\s+@(\\w+)(\\(((.|\n)*)\\))?`))
      if (directive) {
        types[type] = { directives: {} }
        types[type].directives[directive[1]] = directive?.[3] ? directive[3].split(',').map(arg => {
          return { 
            [arg.trim().split(':')[0]]: arg.trim().split(':')[1].match(/"(.*?)"/)?.[1]
          }
        }) : true

        // turn this into an object instead of an array of objects
        if (types[type].directives[directive[1]] instanceof Array) {
          types[type].directives[directive[1]] = types[type].directives[directive[1]].reduce((acc, curr) => {
            return { ...acc, ...curr }
          } , {})
        }
      }
    })

    await Object.keys(types).asyncForEach(async (type) => {
      // match eveything after the type name and the anything and then {
      schema = schema.replace(/NN/g, '\n');
      let match = schema.match(new RegExp(`type ${type}(.*?){((.|\n)*?)}`))
      let fields = parseFields(match[2])
      console.log(fields)
      types[type].fields = fields
    //   let fields = {}
    //   if (match) {
    //     await match[2].split('  ').asyncForEach(async (field) => {
    //       let fieldName, fieldType, args;
    //       if (field.includes('):')) {
    //         fieldName = field.split('):')[0] + ')'
    //         // remove everything inside the () and save it to args in regex
    //         let [_fieldName, _args] = fieldName.split('(')
    //         fieldName = _fieldName
    //         args = _args?.split(')')[0].split(',').map(arg => {
    //           return {
    //             [arg.trim().split(':')[0]]: arg.trim().split(':')[1]?.trim()
    //           }
    //         })

    //         // turn this into an object instead of an array of objects
    //         if (args instanceof Array) {
    //           args = args.reduce((acc, curr) => {
    //             return { ...acc, ...curr }
    //           } , {})
    //         }
    //         fieldType = field.split('):')[1]
    //       } else {
    //         let [_fieldName, ...rest] = field.split(':');
    //         fieldType = rest.join(':');
    //         fieldName = _fieldName;
    //       }

    //       if (fieldType?.includes('@')) {
    //         let dirSplit = fieldType.split('@')
    //         await dirSplit.slice(1).asyncForEach(async (directive) => {
    //           let dir = directive.match(new RegExp(`(\\w+)(\\(((.|\n)*)\\))?`))
    //           if (dir) {
    //             if (!fields[fieldName]?.directives) {
    //               fields[fieldName] = { directives: {} }
    //             }
    //             fields[fieldName].directives[dir[1]] = dir?.[3] ? dir[3].split(',').map(arg => {
    //               return {
    //                 [arg.trim().split(':')[0]]: arg.trim().split(':')[1].match(/"(.*?)"/)?.[1]
    //               }
    //             }) : true
    
    //             // turn this into an object instead of an array of objects
    //             if (fields[fieldName].directives[dir[1]] instanceof Array) {
    //               fields[fieldName].directives[dir[1]] = fields[fieldName].directives[dir[1]].reduce((acc, curr) => {
    //                 return { ...acc, ...curr }
    //               } , {})
    //             }
    
    //             fields[fieldName].type = dirSplit[0].trim()
    //           }
    //         })
    //       } else if (fieldName && fieldType) {
    //         fields[fieldName.trim()] = fieldType?.trim()
    //       }

    //       if (args && typeof fields[fieldName.trim()] === 'object') {
    //         fields[fieldName.trim()].args = args
    //       }
    //     })
    //     types[type].fields = fields
    //   }
    })
    globalTypes = deepMerge(globalTypes, types)
  })

  // console.log(JSON.stringify(globalTypes, null, 2))
  let mappingTemplates = []
  // for every typ that has the resolver directive, we will need to create a mappingTemplate object
  // that will be used to create the mappingTemplate for the resolver
  await Object.keys(globalTypes).asyncForEach(async (type) => {
    if (globalTypes[type]?.fields) {
      await Object.keys(globalTypes[type].fields).asyncForEach(async (field) => {
        if (globalTypes[type].fields[field]?.directives?.resolver) {
          let mappingTemplate = {
            dataSource: globalTypes[type].fields[field]?.directives?.resolver?.dataSource || '',
            type: globalTypes[type].fields[field]?.directives?.resolver?.type || type,
            field: globalTypes[type].fields[field]?.directives?.resolver?.field || field,
            request: globalTypes[type].fields[field]?.directives?.resolver?.request || `${field}RequestTemplate.json`,
            response: globalTypes[type].fields[field]?.directives?.resolver?.response || `defaultResponseTemplate.json`
          }
          let _dataSources = fs.readFileSync(`${__dirname}/dataSources.yml`, 'utf8')
          let { dataSources } = parse(_dataSources)
          if (!dataSources.some(source => source.name === mappingTemplate.dataSource)) {
            let response = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'createDataSource',
                message: `DataSource ${mappingTemplate.dataSource} does not exist. Would you like to create it?`,
              }
            ])
            if (response.createDataSource) {
              let response = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'name',
                  message: 'What is the url of the data source?',
                  default: mappingTemplate.dataSource
                },
                {
                  type: 'input',
                  name: 'type',
                  message: 'What is the type of the data source?',
                  default: 'AWS_LAMBDA'
                },
                {
                  type: 'input',
                  name: 'description',
                  message: 'What is the description of the data source?',
                  default: 'Lambda DataSource'
                },
                {
                  type: 'input',
                  name: 'roleArn',
                  message: 'What is the role arn of the data source?',
                  default: 'mmAppSyncLambdaRole'
                },
                {
                  type: 'input',
                  name: 'functionArn',
                  message: 'What is the function arn of the data source? Use the env name, not the entire arn.',
                }
              ])

              dataSources.push({
                name: response.name,
                type: response.type,
                description: response.description,
                config: {
                  serviceRoleArn: {
                    'Fn::GetAtt:': [response.roleArn, 'Arn'],
                  },
                  lambdaConfig: {
                    'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:${self:service}-${self:provider.stage}-${self:custom.env.FUNCTIONS.' + response.functionArn + '}',
                  }
                }
              })

              fs.writeFileSync(`${__dirname}/dataSources.yml`, stringify({ dataSources }, {
                header: true,
                indent: 2
              }))
              console.log(`DataSource ${mappingTemplate.dataSource} created. You can edit it in ${__dirname}/dataSources.yml`)
            }
          }
          mappingTemplates.push(mappingTemplate)
          globalTypes[type].fields[field].mappingTemplate = mappingTemplate
          // if they did not pass in a reqest template, lets make one for them 
          if (!globalTypes[type].fields[field]?.directives?.resolver?.request) {
            let additionalPayload = {}
            if (globalTypes[type].fields[field]?.directives?.resolver?.payload) {
              additionalPayload = JSON.parse(globalTypes[type].fields[field]?.directives?.resolver?.payload.replace('"', '').replace('"', ''))
            }
            let payload = {
              field: `"${field}"`,
              identity: '$util.toJson($context.identity)',
              arguments: '$util.toJson($context.arguments)',
              ...additionalPayload
            }
            let requestTemplate =
  `
  {
    "version": "${globalTypes[type].fields[field]?.directives?.resolver?.version || '2017-02-28'}",
    "operation": "${globalTypes[type].fields[field]?.directives?.resolver?.operation || 'Invoke'}",
    "payload": {
      ${Object.keys(payload).map(key => `"${key}": ${payload[key]}`).join(',\n    ')}
    }
  }`
          // create a new file for the request template
          fs.writeFileSync(`${__dirname}/${globalTypes[type].fields[field]?.directives?.resolver?.request || `${field}RequestTemplate.json`}`, requestTemplate)
          }
        }
      })
    }
  })

  // console.log(mappingTemplates)
  fs.writeFileSync('./appsync-gql.map.json', JSON.stringify(globalTypes, null, 2))
}

go()
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import deepMerge from 'deepmerge';
import { parse, stringify } from 'yaml'
import inquirer from 'inquirer';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// get the mappingTempaltes file
const _mappingTemplates = fs.readFileSync(path.join(__dirname, 'mappingTemplates.yml'), 'utf-8');
// convert it
const { mappingTemplates } = parse(_mappingTemplates);
let alreadylisted = [];
mappingTemplates.forEach(template => { 
  // find the type inside of the graphql file
  let schema = fs.readFileSync(path.join(__dirname, 'rev.graphql'), 'utf-8');

  let types = schema.match(new RegExp(`(\\): .*)`, 'g'))
  //for each type add a indication after it like this ' |TYPE| '
  
  // types.forEach(type => {
  //   if(!alreadylisted.includes(template.field + type)){
  //     alreadylisted.push(template.field + type);
  //     schema = schema.replace(type, type + ' |TYPE| ');
  //     console.log(alreadylisted)
  //   } 
  // });

  //console.log(tryThis)
  let _field = schema.match(new RegExp(`(?<field>${template.field})(?<args>\\((.|\n)*?\\):)?(?<type>.*?(\\)|\n))?`));
  let args = _field?.groups.args.replace('(', '').replace('):', '').split(',').map(arg => ({
    name: arg.split(':')[0].trim(),
    type: arg.split(':')[1].trim()
  }));
  let type;
  args = args?.reduce((acc, arg) => {
    acc[arg.name] = arg.type;
    return acc;
  } ,{});
  let field = _field?.groups.field
  let _directives = [];
  let allowNull;
  let required;
  if (_field?.groups?.type && _field?.groups?.type.includes('@')) {
    let dirSplit = (_field?.groups?.type).split('@')
    type = dirSplit[0].trim();
    if (type.includes('[')) {
      type = type.split('[')[1]
      let sp = type.split(']')
      type = sp[0]
      if (sp[1] === '!') {
        allowNull = false
      }
      if (type.includes('!')) {
        required = true
      }
    }
    dirSplit.slice(1).forEach(async (directive) => {
      let dir = directive.match(new RegExp(`(\\w+)(\\(((.|\n)*)\\))?`))
      console.log(dir)
      if (dir) {
        _directives.push(dir?.[3] ? {
          [dir[1]]: dir[3].split(',').map(arg => {
            return {
              [arg.trim().split(':')[0]]: arg.trim().split(':')[1].match(/"(.*?)"/)?.[1]
            }
          }).reduce((acc, curr) => {
            return { ...acc, ...curr }
          } , {})
        } : { [directive.trim()]: true })

      }
    })

    // turn this into an object instead of an array of objects
    if (_directives instanceof Array) {
      _directives = _directives.reduce((acc, curr) => {
        return { ...acc, ...curr }
      } , {})
    }
  } else {
    type = _field?.groups?.type.trim();
    if (type.includes('[')) {
      type = type.split('[')[1]
      let sp = type.split(']')
      type = sp[0]
      if (sp[1] === '!') {
        allowNull = false
      }
      if (type.includes('!')) {
        required = true
      }
    }
  }

  if (required && allowNull === false) {
    
  }

  console.log({
    type,
    field,
    args,
    directives: _directives
  })
  // if (field && field[0].split('(')[0] === template.field) {
  //   let requestTemplate
  //   if (fs.existsSync(path.join(__dirname, template.request))) {
  //     requestTemplate = fs.readFileSync(path.join(__dirname, template.request), 'utf-8');
  //     if (requestTemplate) {
  //       requestTemplate = JSON.parse(requestTemplate.replace(/\$u/g, '"$u').replace(/\)/g, ')"'));
  //     }
  //     // add the word check at the end of that line
  //     field[0] = field[0].replace(/\n$/, '') + ` @resolver(dataSource: "${template.dataSource}", operation: "${requestTemplate?.operation || "Invoke"}", payload: "{${Object.keys(requestTemplate?.payload)?.map(key => `'${key}': '${requestTemplate?.payload?.[key]}'`)}}")\n`;
  //     // replace the line in the graphql file
  //     schema = schema.replace(new RegExp(`${template.field}.*?\n`), field[0]);
  //     // write the new graphql file
  //     fs.writeFileSync(path.join(__dirname, 'rev.graphql'), schema);
  //   } else {
  //     console.log(`${template.request} does not exist`);
  //   }
  // }
})
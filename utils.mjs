export function parseFields(schema) {
  console.log('schema', schema.trim())
  let __field = schema.trim().match(new RegExp(`(?<field>.*?(\\(|\\:))(?<args>(.|\n)*?\\):)?(?<type>(.)*?(\\)|\n|$))?`, 'g'));
  console.log('regex', __field)
  let retFields = {}
  if (__field) {
    __field.forEach(f => {
      let _field = f.match(new RegExp(`(?<field>.*?(\\(|\\:))(?<args>(.|\n)*?\\):)?(?<type>(.)*?(\\)|\n|$))?`));
      console.log('_field', _field)
      let args = _field?.groups?.args?.replace('(', '').replace('):', '').split(',').map(arg => ({
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
      let isArray;
      let raw;
      if (_field?.groups?.type && _field?.groups?.type?.includes('@')) {
        let dirSplit = (_field?.groups?.type).split('@')
        type = dirSplit[0].trim();
        raw = dirSplit[0].trim();
        if (type?.includes('[')) {
          isArray = true;
          type = type.split('[')[1]
          let sp = type.split(']')
          type = sp[0]
          if (sp[1] === '!') {
            required = true
          }
          if (type?.includes('!')) {
            allowNull = false
          }
        } else if (type?.includes('!')) {
          required = true
        }
        if (type?.includes('[')) {
          type = type.split('[')[1]
          let sp = type.split(']')
          type = sp[0]
          if (sp[1] === '!') {
            allowNull = false
          }
          if (type?.includes('!')) {
            required = true
          }
        }
        dirSplit.slice(1).forEach(async (directive) => {
          let dir = directive.match(new RegExp(`(\\w+)(\\(((.|\n)*)\\))?`))
          if (dir) {
            _directives.push(dir?.[3] ? {
              [dir[1]]: dir[3].split(',').map(arg => {
                return {
                  [arg.trim().split(':')[0]]: arg.trim().split(':')[1]
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
        raw = _field?.groups?.type.trim();
        if (type?.includes('[')) {
          isArray = true;
          type = type.split('[')[1]
          let sp = type.split(']')
          type = sp[0]
          if (sp[1] === '!') {
            required = true
          }
          if (type?.includes('!')) {
            allowNull = false
          }
        } else if (type?.includes('!')) {
          required = true
        }
      }
    
      type = {
        type,
        isArray: isArray || false,
        required: required || false,
        ...(isArray) && { emptyArrayAllowed: allowNull === false ? false : true },
        raw
      }
    
      retFields[field.replace(':', '').replace('(', '').trim()] = {
        type,
        args,
        directives: _directives
      }
    })
  }

  return retFields
}
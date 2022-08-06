`@resolver` -- What is the handler for this field
  -- type (implied)
  -- field (implied)
  -- request (optional) -- also creates a `field`RequestTemplate.json file
  -- response (optional) -- default is defaultResponseTemplate.json
  -- dataSource (optional) -- default is the name of the file before .schema + LambdaDataSource
  -- operation (optional) -- default is "Invoke"
  -- version (optional) -- default is "2017-02-28"
  -- payload (optional) -- default is "{field: field, identity:, arguments}"

you can use a resolver on a field as well

`@input` -- Please create an identical copy of this type except input

would love some auto generate on the dataSources too and also maybe even in functions.yml


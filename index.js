import apollo from 'apollo-server'
import gql_import from 'graphql-import-files'
import resolvers from './resolver/resolver.js'

const { ApolloServer } = apollo
const { loadFiles } = gql_import

const server = new ApolloServer({
  typeDefs: loadFiles('**/schema/**/*.{graphql,gql}'), // Use the glob pattern to find multiple files
  resolvers
})

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`Running on ${url}`)
})

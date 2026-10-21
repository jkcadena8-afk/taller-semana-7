// Las migraciones .sql se importan como texto gracias a babel-plugin-inline-import
declare module '*.sql' {
  const content: string;
  export default content;
}

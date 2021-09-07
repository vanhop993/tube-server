
export function CreateKeyspaceCassandra (keyspaceName:string) : string {
  const query = `CREATE KEYSPACE IF NOT EXISTS ${keyspaceName} WITH replication = {'class': 'SimpleStrategy', 'replication_factor':'1'} AND durable_writes = 'true'`
  return query;
}

interface OrderBy {
  key:string,
  type:string,
}

export interface QueryInsertMulti {
  query:string;
  params:string[];
}

export function CreateTableCassandra <T>(tableName:string, object:T, arrayPrimary:string[],ortherKey?:string[],orderBy?:OrderBy) : string{
  const keysCol = Object.keys(object);
  const typesDataCol = Object.values(object);
  const colsArray = [];
  let orderByString = "";
  keysCol.forEach((item,index) =>{
    colsArray.push(`${item} ${typesDataCol[index]}`) ;
  });
  
  if(ortherKey){
    ortherKey.unshift("");
  }
  if(orderBy){
    orderByString += `WITH CLUSTERING ORDER BY (${orderBy.key} ${orderBy.type})`;
  }
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${colsArray.join()}, PRIMARY KEY(${arrayPrimary.join()} ${ortherKey ? ortherKey.join() : ''})) ${orderByString}`
  console.log(query);
  return query;
}

export function CreateLuceneIndex (name:string,keyspace:string,tableName:string, fields:any) : string {
  const query = `CREATE CUSTOM INDEX IF NOT EXISTS ${name} ON ${keyspace}.${tableName} (title) USING 'com.stratio.cassandra.lucene.Index' WITH OPTIONS = {'refresh_seconds': '1','schema': '{fields: ${JSON.stringify(fields)}}'};`
  console.log(query);
  return query;
}

export function CreateTypeCassandra(typeName:string,object:any): string{
  const keysCol = Object.keys(object);
  const typesDataCol = Object.values(object);
  const colsArray = [];
  keysCol.forEach((item,index) =>{
    colsArray.push(`${item} ${typesDataCol[index]}`) ;
  });
  const query = `CREATE TYPE IF NOT EXISTS ${typeName} (${colsArray.join()})`
  console.log(query);
  
  return query;
}

export function querySelect(tableName:string,key:string,fieldGet:string[],fieldsCheck:string[],allowFiltering:boolean) : string {
  let allowFilteringString = '';
  if(allowFiltering) {
    allowFilteringString = 'ALLOW FILTERING'
  }
  return `SELECT ${buildFields(fieldGet,fieldsCheck)} FROM ${tableName} WHERE ${key} = ? ${allowFilteringString}`;
}

export function querySelectInArray<T>(tableName:string,keyWhere:string,fields?:string[],checkFields?:string[],arrayValue?:T[],sort?:string,typeSort?:string,allowFiltering?:boolean) : string {
  let arrayQuestion = [];
  let sortString = '';
  let allowFilteringString = "";
  arrayValue.forEach(() =>{
    arrayQuestion.push("?");
  })
  if(allowFiltering) {
    allowFilteringString = 'ALLOW FILTERING'
  }
  if(sort && typeSort) {
    sortString = `order by ${sort} ${typeSort}`
  }
  return `SELECT ${buildFields(fields,checkFields)} FROM ${tableName} WHERE ${keyWhere} in (${arrayQuestion.join()}) ${sortString} ${allowFilteringString}`;
}

export function queryInsertMulti <T>(tableName:string,obj?:T) : QueryInsertMulti {
  let queryQuestion = [];
  const params = Object.values(obj);
  const keys = Object.keys(obj);
  keys.forEach(() => {
    queryQuestion.push("?");
  });
  return  {
    query:`INSERT INTO ${tableName} (${keys.join()}) VALUES (${queryQuestion.join()})`,
    params
  }
}

export function queryUpdateMulti<T>(tableName:string,keyWhere:string,valueWhere: any,obj?:T) : QueryInsertMulti {
  let queryQuestion = [];
  const params = Object.values(obj);
  const keys = Object.keys(obj);
  keys.forEach(() => {
    queryQuestion.push(`${keys} = ?`);
  });
  return  {
    query:`UPDATE ${tableName} SET ${keys.join()} WHERE ${keyWhere} = ${valueWhere}`,
    params
  }
}

export function getFields<T>(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const existFields : string [] = []; 
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        existFields.push(s);
      }
    }
    if(existFields.length === 0){
      return all;
    }else{
      return existFields;
    }

  } 
  else {
    return fields;
  }
}
export function buildFields<T>(fields: string[], all?: string[]): string {
  const s = getFields(fields,all);
  if(!s || s.length === 0){
    return '*';
  }else{
    return s.join();
  }
}
import { Client,auth, QueryOptions, types, ArrayOrObject } from "cassandra-driver";
import { CategorisTable, categorisType, ChannelSyncTable, ChannelTable, PlaylistTable, PlaylistVideoTable, VideoTable } from "./CassandraTable";
import { channelLuceneIndex, playlistLuceneIndex, videoLuceneIndex } from "./luceneIndex";
import { CreateKeyspaceCassandra, CreateLuceneIndex, CreateTableCassandra, CreateTypeCassandra, QueryInsertMulti, queryInsertMulti, querySelect, querySelectInArray, queryUpdateMulti } from "./QueryCassandra";

export interface CassandraConfig {
  uri: string ;
  keyspaceName: string;
  dataCenter?: string;
  userDb?:string;
  passworDb?:string;
  pool_size?: number;
}
export interface StringMap {
  [key: string]: string;
}

export interface QueriesBatch {
  query:string,
  params:ArrayOrObject,
}

export interface QueryCassandra {
  query:string;
}

export async function  connectToDb(url:string[],keyspaceName:string,dataCenter:string,userDb:string,passworDb)  {
  try{
    const client = new Client({
      contactPoints: url,
      localDataCenter: dataCenter,
      authProvider: new auth.DsePlainTextAuthProvider(userDb, passworDb),
    });
    await CreateKeyspaceAndTables(client,keyspaceName);
    client.keyspace = keyspaceName;
    await client.connect();
    console.log("Connect cassandra success");
    return client;
  }catch(err){
    console.log("Database error:",err);
    return err;
  }
}

export async function CreateKeyspaceAndTables (client:Client,keyspaceName:string) {
  await client.execute(CreateKeyspaceCassandra(keyspaceName));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${ChannelTable.tableName}`,ChannelTable.cols,ChannelTable.primaryKey));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${ChannelSyncTable.tableName}`,ChannelSyncTable.cols,ChannelSyncTable.primaryKey));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${PlaylistTable.tableName}`,PlaylistTable.cols,PlaylistTable.primaryKey));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${PlaylistVideoTable.tableName}`,PlaylistVideoTable.cols,PlaylistVideoTable.primaryKey));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${VideoTable.tableName}`,VideoTable.cols,VideoTable.primaryKey));
  await client.execute(CreateTypeCassandra(`${keyspaceName}.${categorisType.name}`,categorisType.cols));
  await client.execute(CreateTableCassandra(`${keyspaceName}.${CategorisTable.tableName}`,CategorisTable.cols,CategorisTable.primaryKey));
  await client.execute(CreateLuceneIndex(videoLuceneIndex.name,keyspaceName,videoLuceneIndex.tableName,videoLuceneIndex.fields));
  await client.execute(CreateLuceneIndex(channelLuceneIndex.name,keyspaceName,channelLuceneIndex.tableName,channelLuceneIndex.fields));
  await client.execute(CreateLuceneIndex(playlistLuceneIndex.name,keyspaceName,playlistLuceneIndex.tableName,playlistLuceneIndex.fields));
}

export async function getAll<T>(client: Client, table: string) : Promise<T[]> {
  const query = `Select * from ${table}`
  return client.execute(query).then((result) => {
    return result.rows
  }).catch(err =>{
    return err
  })
}

export async function getByArrayId<T>(client: Client, table: string, key:string, values: string[]) : Promise<T[]> {
  const query = `Select * from ${table}`
  return client.execute(query).then((result) => {
    return result.rows
  }).catch(err =>{
    return err
  })
}

export async function getArrayValueSort<T>(client: Client, table: string, keyWhere:string , value:string[], sort: string , typeSort:string , options: QueryOptions,fields?: string[],checkFields ?:string[]) : Promise<T> {
  const query = querySelectInArray(table,keyWhere,fields,checkFields,value,sort,typeSort,true);
  return client.execute(query , value, options).then((result) => {
    return result
  }).catch(err =>{
    console.log(err);
    return err
  })
}

export async function getById<T>(client: Client, table: string, id: string, value:string,fields:string[],fieldsCheck:string[],allowFiltering:boolean) : Promise<T> {
    const query = querySelect(table,id,fields,fieldsCheck,allowFiltering);
    return client.execute(query,[value],{prepare:true}).then((result) => {
      return result.rows[0]
    }).catch(err =>{
      console.log(err);
      return err
    })
}

export async function  executeOne<T> (client:Client,query:string,param:any,option:QueryOptions) : Promise<T> {
  return client.execute(query,[param], option ? option : { prepare: true }).then((result) =>{
    return result.rows[0];
  }).catch((err) => {
    console.log(err);
    return err;
  })
}

export function batch<T> (client:Client,queries:QueriesBatch[],option:QueryOptions) : Promise<T> {
  return client.batch( queries, option ? option : { prepare: true }).then((result) =>{
    return result.rows;
  }).catch((err) => {
    console.log('batch',err);
    return err;
  })
}

export async function batchToLarge<T> (client:Client,queries:QueriesBatch[] ,range:number , bactchItems :number, option: QueryOptions ) :  Promise<T>{
  if(queries.length > range ){
    const arrayPromise = [];
    while(queries.length !== 0){
      if(queries.length > bactchItems) {
        arrayPromise.push(client.batch(queries.splice(0,bactchItems), option ? option : { prepare: true })) ;
      }else{
        arrayPromise.push(client.batch(queries.splice(0,queries.length),  option ? option : { prepare: true })) ;
      }
    }
    return await handlePromiseAll<T>(arrayPromise);
  }else{
    return client.batch( queries, option ? option : { prepare: true }).then((result) =>{
      return result.rows;
    }).catch((err) => {
      console.log('batch',err);
      return err;
    })
  }
}

export function handlePromiseAll<T> (arrayPromise:Promise<types.ResultSet>[]) : Promise<T> {
  return Promise.all(arrayPromise).then((result) =>{
    let arrRealResult = [];
    result.forEach(item =>{
      if(item.rows){  
        arrRealResult = [... arrRealResult,...item.rows];
      }
    })
    return arrRealResult
  }).catch((err) => {
    console.log(err);
    return err;
  })
}

export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = obj[key];
    }
    objs.push(obj2);
  }
  return objs;
}


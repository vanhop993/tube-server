import {Client , QueryOptions } from 'cassandra-driver';
import {
  Channel,
  channelFields,
  channelMap,
  ChannelSM,
  isEmpty,
  Item,
  ItemSM,
  ListResult,
  Playlist,
  PlaylistCollection,
  playlistFields,
  playlistMap,
  PlaylistSM,
  PlaylistVideo,
  Video,
  VideoCategory,
  videoFields,
  videoMap,
  VideoService,
  YoutubeClient,
} from "../../video-plus";
import {  getById, getArrayValueSort, handlePromiseAll, mapArray, StringMap } from './cassandra';
import { CategorisTable, ChannelSyncTable, ChannelTable, PlaylistTable, PlaylistVideoTable, VideoTable } from './CassandraTable';
import { buildFields, queryInsertMulti, querySelect, querySelectInArray } from './QueryCassandra';

export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}

export class CassandraTubeService implements VideoService {
  private readonly client: Client;
  private readonly id = 'id';
  private readonly channelId = 'channelId';
  private readonly playlistId = 'playlistId';
  private readonly publishedAt = 'publishedAt';
  private readonly channelsTable: string;
  private readonly videosTable: string;
  private readonly channelSyncTable: string;
  private readonly playlistsTable: string;
  private readonly playlistVideoTable: string;
  private readonly categorisTable: string;
  constructor(db: Client, private YoutuClient: YoutubeClient) {
    this.client = db;
    this.channelsTable = ChannelTable.tableName;
    this.videosTable = VideoTable.tableName;
    this.channelSyncTable = ChannelSyncTable.tableName;
    this.playlistsTable = PlaylistTable.tableName;
    this.playlistVideoTable = PlaylistVideoTable.tableName;
    this.categorisTable = CategorisTable.tableName;
  }
  async getChannel(channelId: string , fields?: string[]): Promise<Channel> {
    const result = await getById<Channel>(this.client, this.channelsTable, this.id,channelId,fields,channelFields,true);
    return mapArray([result],channelMap)[0]
  }
  async getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const result = await getArrayValueSort<any>(
      this.client, 
      this.channelsTable,
      this.id,
      channelIds,
      undefined,
      undefined,
      undefined,
      fields,
      channelFields
    )
    return mapArray(result.rows , channelMap);
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    return getById<Channel>(this.client, this.playlistsTable, this.id,id,fields,playlistFields,true);
  }
  async getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    const result = await getArrayValueSort<any>(
      this.client, 
      this.playlistsTable,
      this.id,
      ids,
      undefined,
      undefined,
      undefined,
      fields
    )
    return result.rows;
  }
  async getVideo(id: string, fields?: string[], noSnippet?: boolean): Promise<Video> {
    const result = await getById<Video>(this.client, this.videosTable, this.id,id,fields,videoFields,true);
    return mapArray([result],videoMap)[0]
  }
  async getVideos(ids: string[], fields?: string[], noSnippet?: boolean): Promise<Video[]>{
    const query = querySelectInArray(this.videosTable,this.id,undefined,videoFields,ids);
    return this.client.execute(query,ids,{ prepare: true }).then(result => {
      return result.rows.map(item => item.id)
    })
  }
  async getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next,max);
    const sort = [{field: `publishedat`, reverse: true}];
    const must = [{type: "match", field: `${this.channelId.toLowerCase()}`,value: `${channelId}`}];
    const a = {
      filter: {
        must,
      },
      sort
    }
    const queryObj = JSON.stringify(a);
    const query = `select ${buildFields(fields,videoFields)} from ${this.playlistsTable} where expr(playlist_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,playlistMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  async getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const limit = getLimit(max);
    const skip = getSkipNumber(nextPageToken);
    return getById<PlaylistCollection>(this.client,this.playlistVideoTable,this.id,playlistId,undefined,undefined,false).then((playlist) => {
      let checkNext = false;
      if (skip + limit === playlist.videos.length) {
        checkNext = true;
      }
      const ids = playlist.videos.slice(skip, skip + limit);
      const arrayPromise = ids.map(item => {
        const query = querySelect(this.videosTable,this.id,fields,videoFields,true);
        return this.client.execute(query,[item], { prepare: true })
      })
      return handlePromiseAll<Video[]>(arrayPromise).then((list) => {
        const result: ListResult<PlaylistVideo> = { list:mapArray(list,videoMap) };
        result.nextPageToken = getNextPageTokenNumber(list,max,skip);
        return result
      })
    })
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,limit);
    const objQuery = buildSearchQuery(sm,this.videosTable,'video_index',fields,videoFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,limit);
    const objQuery = buildSearchQuery(sm,this.videosTable,'video_index',fields,videoFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  searchPlaylists(sm: PlaylistSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Playlist>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const objQuery = buildSearchQuery(sm, this.playlistsTable,'playlist_index',fields,playlistFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,playlistMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  searchChannels(sm: ChannelSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Channel>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const objQuery = buildSearchQuery(sm, this.channelsTable,'channel_index',fields,channelFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,channelMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    return this.getVideo(videoId).then((video) => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      }else {
        const should =video.tags.map(item => { return {type: "contains", field: "tags", values: item}});
        const not = [{type: "match", field: "id", value: videoId}];
        const sort = [{field: `publishedat`, reverse: true}];
        const queryObj = `{filter: [{should:${JSON.stringify(should)}} ${not.length > 0 ? `,{not:${JSON.stringify(not)}}`:''}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}`: ''}}`;
        const query = `select ${buildFields(fields,videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
        return this.client.execute(query, undefined, options ).then((result) => {
          return {
            list: mapArray(result.rows,videoMap),
            nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
          }
        }).catch((err) => {
          console.log(err);
          return err 
        })
      }
    })
  }
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{${sort.length > 0 ? `sort: ${JSON.stringify(sort)}`: ''}}`;
    const query = `select ${buildFields(fields,videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
        console.log(err);
        return err 
    })
  }
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const should = [{type: "match", field: "categoryid", value: videoCategoryId}];
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{filter: [{should:${JSON.stringify(should)}}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}`: ''}}`;
    const query = `select ${buildFields(fields,videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>>{
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const sort = [{field: `publishedat`, reverse: true}];
    const not = [{type: "contains", field: "blockedregions", values: [regionCode]}];
    let a:any;
    if(regionCode){
      a = {
        filter: {
          not,
        },
        sort
      }
    }else{
      a = {
        sort
      }
    }
    const queryObj = JSON.stringify(a);
    const query = `select ${buildFields(fields,videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    return getById<CategoryCollection>(this.client,this.categorisTable,this.id,regionCode,undefined,undefined,false).then((category) => {
      if (category) {
        return category;
      } else {
        return this.YoutuClient.getCagetories(regionCode).then(async (r) => {
          const categoryToSave: VideoCategory[] = r.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode,
            data: categoryToSave,
          };
          const queries = queryInsertMulti<CategoryCollection>(this.categorisTable,newCategoryCollection);
          return this.client.batch([queries], { prepare: true }).then((result) =>{
            return newCategoryCollection
          }).catch((err) => {
            console.log(err);
            return err;
          })
        })
      }
    })
  }
  async getChannelVideos(channelId: string,max: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options =getOption(next,max);
    const should = [{type: "match", field: "channelid", value: channelId}];
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{filter: [{should:${JSON.stringify(should)}}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}`: ''}}`;
    const query = `select ${buildFields(fields,videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows,videoMap),
        nextPageToken: getNextPageTokenString(result.rows,max,result.pageState),
      }
    }).catch((err) => {
      console.log(err);
      return err 
    })
  }
}

export function getNextPageTokenNumber<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = "id";
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 1 ? `${list[list.length - 1][name]}|${skip + limit}` : undefined;
  }
}
export function getNextPageTokenString<T>(list: T[], limit: number, next: string, name?: string): string {
  if (!name || name.length === 0) {
    name = "id";
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 0 ? `${list[list.length - 1][name]}|${next}` : undefined;
  }
}
export function getLimit(limit?: number, d?: number): number {
  if (limit) {
    return limit;
  }
  if (d && d > 0) {
    return d;
  }
  return 12;
}
export function getSkipNumber(nextPageToken: string): number {
  if (nextPageToken) {
    const arr = nextPageToken.toString().split("|");
    if (arr.length < 2) {
      return undefined;
    }
    if (isNaN(arr[1] as any)) {
      return 0;
    }
    const n = parseFloat(arr[1]);
    const s = n.toFixed(0);
    return parseFloat(s);
  }
  return 0;
}
export function getSkipString(nextPageToken: string): string {
  if (nextPageToken) {
    const arr = nextPageToken.toString().split("|");
    if (arr.length < 2) {
      return undefined;
    }
    return arr[1];
  }
  return '';
}
export function getOption(nextPageToken:string,max?:number) : QueryOptions{
  let options :QueryOptions ;
  if(!nextPageToken) {
    options = { prepare:true , fetchSize:Number(max) };
  }else {
    options = { pageState:nextPageToken , prepare:true , fetchSize:Number(max) };
  }
  return options;
}
export function buildSearchQuery(s: any ,tableName:string,index:string,fields?:string[],mapFields?:string[]): any {
  const arrayKeys = Object.keys(s);
  const arrayValues = Object.values(s);
  const should = [];
  const must = [];
  const not = [];
  const sort = [];
  arrayKeys.forEach((key, index) => {
    if (key === "q") {
      should.push({type: "phrase", field: "title", value: `${s.q}`});
      should.push({type: "prefix", field: "title", value: `${s.q}`});
      should.push({type: "wildcard", field: "title", value: `*${s.q}`});
      should.push({type: "wildcard", field: "title", value: `${s.q}*`});
      should.push({type: "wildcard", field: "title", value: `*${s.q}*`});
      should.push({type: "phrase", field: "description", value: `${s.q}`});
      should.push({type: "prefix", field: "description", value: `${s.q}`});
      should.push({type: "wildcard", field: "description", value: `*${s.q}`});
      should.push({type: "wildcard", field: "description", value: `${s.q}*`});
      should.push({type: "wildcard", field: "description", value: `*${s.q}*`});
    } 
    else if (key === "duration") {
      switch (s.videoDuration) {
        case "short":
          must.push({type: "range", field: "duration", lower: "0",upper: "240"});
          break;
        case "medium":
          must.push({type: "range", field: "duration", lower: "240",upper: "1200"});
          break;
        case "long":
          must.push({type: "range", field: "duration", lower: "1200"});
          break;
        default:
          break;
      }
      if (s.publishedBefore && s.publishedAfter) {
        must.push({type: "range", field: "publishedat", lower: s.publishedBefore.toISOString().replace("T"," "),upper: s.publishedAfter.toISOString().replace("T"," ")});
      } else if ( s.publishedAfter) {
        must.push({type: "range", field: "publishedat", upper: s.publishedAfter.toISOString().replace("T"," ")});
      } else if (s.publishedBefore) {
        must.push({type: "range", field: "publishedat", lower: s.publishedAfter.toISOString().replace("T"," ")});
      }
    }
    else if (!isEmpty(s.regionCode) && key === 'regionCode') {
      not.push({type: "contains", field: "blockedregions", values: [s.regionCode]});
    }
    else if(key === 'sort' && s.sort){
      sort.push({field: `${s.sort.toLowerCase()}`, reverse: true});
    }
    else if (arrayValues[index] !== undefined && key != 'publishedAfter' && key !='publishedBefore') {
      must.push({type: "match", field: `${key.toLowerCase()}`,value: `${arrayValues[index]}`});
    }
  });
  const a = {
    filter: {
      should,
      must,
      not,
    },
    sort
  }
  if(should.length === 0) {
    delete a.filter.should
  }
  if(must.length === 0) {
    delete a.filter.must
  }
  if(not.length === 0) {
    delete a.filter.not
  }
  if(sort.length === 0) {
    delete a.sort
  }
  const queryObj = JSON.stringify(a);
  const query = `select ${buildFields(fields,mapFields)} from ${tableName} where expr(${index}, '${queryObj}')`;
  return {
    query,
    params:queryObj,
  };
}
export function getMapField(name: string, map?: StringMap): string {
  if (!map) {
    return name;
  }
  const x = map[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}


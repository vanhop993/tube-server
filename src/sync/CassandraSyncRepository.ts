import { Client } from "cassandra-driver";
import { query } from "express";
import { batch, batchToLarge, executeOne } from "../services/cassandra/cassandra";
import { ChannelSyncTable, ChannelTable, PlaylistVideoTable, PlaylistTable , VideoTable } from "../services/cassandra/CassandraTable";
import { queryInsertMulti, querySelect, querySelectInArray } from "../services/cassandra/QueryCassandra";
import {
  Channel,
  ChannelSync,
  channelSyncMap,
  mapArray,
  Playlist,
  PlaylistCollection,
  SyncRepository,
  Video,
  videoFields,
} from "../video-plus";

export class CassandraVideoRepository implements SyncRepository {
  private readonly client: Client;
  private readonly id = "id";
  private readonly channelsTable: string;
  private readonly videosTable: string;
  private readonly channelSyncTable: string;
  private readonly playlistsTable: string;
  private readonly playlistVideoTable: string;
  constructor(db: Client) {
    this.client = db;
    this.channelsTable = ChannelTable.tableName;
    this.videosTable = VideoTable.tableName;
    this.channelSyncTable = ChannelSyncTable.tableName;
    this.playlistsTable = PlaylistTable.tableName;
    this.playlistVideoTable = PlaylistVideoTable.tableName;
  }
  async getChannelSync(channelId: string): Promise<ChannelSync> {
    const query = querySelect(this.channelSyncTable,this.id,undefined,undefined,false);
    const result = await executeOne<ChannelSync>(this.client,query,channelId,undefined)
    const resultMap = mapArray<ChannelSync>([result],channelSyncMap)
    return resultMap[0]
  }
  async saveChannel(channel: Channel): Promise<number> {
    const queries = queryInsertMulti<Channel>(this.channelsTable,channel);
    return await batch<number>(this.client,[queries],undefined);
  }
  async saveChannelSync(channel: ChannelSync): Promise<number> {
    const queries = queryInsertMulti<ChannelSync>(this.channelSyncTable,channel);
    return await batch<number>(this.client,[queries],undefined);
  }
  async savePlaylist(playlist: Playlist): Promise<number> {
    const queries = queryInsertMulti<Playlist>(this.playlistsTable,playlist);
    return await batch<number>(this.client,[queries],undefined);
  }
  async savePlaylists(playlists: Playlist[]): Promise<number> {
    const queries = playlists.map(item =>{
      return queryInsertMulti<Playlist>(this.playlistsTable,item);
    })
    return await batch<number>(this.client,queries,undefined);
  }
  async saveVideos(videos: Video[]): Promise<number> {
    const queries = videos.map(item =>{
      return queryInsertMulti<Video>(this.videosTable,item);
    })
    const result = await batchToLarge<Video[]>(this.client,queries,15,5,undefined);
    return result ? result.length : 0;
  }
  async savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    const playlistVideo: PlaylistCollection = {
      id,
      videos,
    };
    const queries = queryInsertMulti<PlaylistCollection>(this.playlistVideoTable,playlistVideo);
    return await batch<number>(this.client,[queries],undefined);
  }
  async getVideoIds(ids: string[]): Promise<string[]> {
    const query = querySelectInArray(this.videosTable,this.id,['id'],videoFields,ids);
    const result = this.client.execute(query,ids,{ prepare: true }).then(result => {
     return result.rows.map(item => item.id)
    }).catch((err)=> {
      console.log(err);
      return err;
    })
    return result;
  }
}

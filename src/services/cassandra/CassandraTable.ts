export const ChannelTable = {
  tableName:"channel",
  cols:{
    id:"varchar",
    count:"int",
    country:"varchar",
    customUrl:"varchar",
    description:"varchar",
    favorites:"varchar",
    highThumbnail:"varchar",
    itemCount:"int",  
    likes:"varchar",
    localizedDescription:"varchar",
    localizedTitle:"varchar",
    mediumThumbnail:"varchar",
    playlistCount:"int",
    playlistItemCount:"int",
    playlistVideoCount:"int",
    playlistVideoItemCount:"int",
    publishedAt:"timestamp",
    thumbnail:"varchar",
    lastUpload:"timestamp",
    title:"varchar",
    uploads:"varchar",
    channels:"list<varchar>"
  },
  primaryKey:["id"]
};

export const ChannelSyncTable = {
  tableName : "channelSync",
  cols:{
    id:"varchar",
    synctime:"timestamp",
    uploads:"varchar"
  },
  primaryKey:["id"]
};

export const PlaylistTable = {
  tableName : "playlist",
  cols:{
    id:"varchar",
    channelId:"varchar",
    channelTitle:"varchar",
    count:"int",
    itemCount:"int",
    description:"varchar",
    highThumbnail:"varchar",
    localizedDescription:"varchar",
    localizedTitle:"varchar",
    maxresThumbnail:"varchar",
    mediumThumbnail:"varchar",
    publishedAt:"timestamp",
    standardThumbnail:"varchar",
    thumbnail:"varchar",
    title:"varchar"
  },
  primaryKey:["id"],
  orderBy:{
    key:"publishedAt",
    type:"DESC"
  },
};

export const PlaylistVideoTable = {
  tableName : "playlistvideo",
  cols:{
    id:"varchar",
    videos:"list<varchar>"
  },
  primaryKey:["id"]
};

export const VideoTable = {
  tableName :"video",
  cols:{
    id:"varchar",
    caption:"varchar",
    categoryId:"varchar",
    channelId:"varchar",
    channelTitle:"varchar",
    defaultAudioLanguage:"varchar",
    defaultLanguage:"varchar",
    definition:"int",
    description:"varchar",
    dimension:"varchar",
    duration:"int",
    highThumbnail:"varchar",
    licensedContent:"boolean",
    liveBroadcastContent:"varchar",
    localizedDescription:"varchar",
    localizedTitle:"varchar",
    maxresThumbnail:"varchar",
    mediumThumbnail:"varchar",
    projection:"varchar",
    publishedAt:"timestamp",
    standardThumbnail:"varchar",
    tags:"list<varchar>",
    thumbnail:"varchar",
    title:"varchar",
    blockedRegions: 'list<varchar>',
    allowedRegions: 'list<varchar>',
  },
  primaryKey:["(id)"],
  orderBy:{
    key:"publishedAt",
    type:"DESC"
  },
};

export const categorisType = {
  name:'categorisType',
  cols:{
    id: 'varchar',
    title:'varchar',
    assignable: 'boolean',
    channelId: 'varchar'
  }
}

export const CategorisTable = {
  tableName: "category",
  cols:{
    id:"varchar",
    data: "list<frozen<categorisType>>"
  },
  primaryKey:["id"]
}

export const videoLuceneIndex = {
  name:'video_index',
  tableName:'video',
  fields: {
    id: {type: 'text'},
    caption: {type: 'boolean'},
    categoryid: {type:'text'},
    channelid: {type: 'text'},
    channeltitle:{type: 'text'},
    defaultaudiolanguage:{type: 'text'},
    defaultlanguage:{type: 'text'},
    definition:{type: 'float'},
    description:{type: 'text'},
    dimension:{type: 'text'},
    duration:{type: 'float'},
    highthumbnail:{type: 'float'},
    licensedcontent:{type: 'boolean'},
    livebroadcastcontent:{type: 'text'},
    localizeddescription:{type: 'text'},
    localizedtitle:{type: 'text'},
    maxresthumbnail:{type: 'text'},
    mediumthumbnail:{type: 'text'},
    projection:{type: 'text'},
    publishedat:{type: 'date', pattern: 'yyyy-MM-dd HH:mm:ss'},
    standardthumbnail:{type: 'text'},
    blockedregions:{type:'string'},
    tags:{type:'string'},
    thumbnail:{type: 'text'},
    title:{type: 'string'}
 }
}


export const playlistLuceneIndex = {
  name: 'playlist_index',
  tableName:'playlist',
  fields: {
    id:{type: "text"},
    channelid:{type: "text"},
    channeltitle:{type: "text"},
    count:{type: "float"},
    itemcount:{type: "float"},
    description:{type: "text"},
    highthumbnail:{type: "text"},
    localizeddescription:{type: "text"},
    localizedtitle:{type: "text"},
    maxresthumbnail:{type: "text"},
    mediumthumbnail:{type: "text"},
    publishedat:{type: "date", pattern: "yyyy-MM-dd HH:mm:ss"},
    standardthumbnail:{type: "text"},
    thumbnail:{type: "text"},
    title:{type: "text"}
  }
}


export const channelLuceneIndex = {
  name:'channel_index ',
  tableName:'channel',
  fields:{
    id:{type: "text"},
    count:{type: "float"},
    country:{type: "text"},
    customurl:{type: "text"},
    description:{type: "text"},
    favorites:{type: "text"},
    highthumbnail:{type: "text"},
    itemcount:{type: "float"},  
    likes:{type: "text"},
    localizeddescription:{type: "text"},
    localizedtitle:{type: "text"},
    mediumthumbnail:{type: "text"},
    playlistcount:{type: "float"},
    playlistitemcount:{type: "float"},
    playlistvideocount:{type: "float"},
    playlistvideoitemcount:{type: "float"},
    publishedat:{type: "date", pattern: "yyyy-MM-dd HH:mm:ss"},
    thumbnail:{type: "text"},
    lastupload:{type: "date", pattern: "yyyy-MM-dd HH:mm:ss"},
    title:{type: "text"},
    uploads:{type: "text"}
  }
}
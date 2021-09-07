import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Client } from 'cassandra-driver';
import { CassandraVideoRepository } from './sync/CassandraSyncRepository';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { log } from './controllers/util';
import {CassandraTubeService} from './services/cassandra/CassandraTubeService';
import { DefaultSyncService, YoutubeClient } from './video-plus';
import { CassandraChecker } from './services/cassandra/cassandraChecker';
import { HealthController } from './controllers/HealthController';

export function createContext(db: Client, key: string): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeClient(key, httpRequest);
  const cassandraChecker = new CassandraChecker(db);
  const healthController = new HealthController([cassandraChecker]);
  const tubeService = new CassandraTubeService(db,client);
  const tubeController = new TubeController(tubeService, log);
  const videoRepository = new CassandraVideoRepository(db);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const ctx: ApplicationContext = { syncController, tubeController , healthController };
  return ctx;
}

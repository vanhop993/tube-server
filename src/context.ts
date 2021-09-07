import { HealthController } from 'controllers/HealthController';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';

export interface ApplicationContext {
  syncController?: SyncController;
  tubeController: TubeController;
  healthController:HealthController;
}

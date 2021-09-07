import { Client } from 'cassandra-driver';

export interface AnyMap {
  [key: string]: any;
}
export interface HealthChecker {
  name(): string;
  build(data: AnyMap, error: any): AnyMap;
  check(): Promise<AnyMap>;
}

export interface CheckResult {
    status: string,
    details: any,
}

export class CassandraChecker implements HealthChecker {
  constructor(private client: Client, private service?: string, private timeout?: number) {
    if (!this.timeout) {
      this.timeout = 4200;
    }
    if (!this.service) {
      this.service = 'cassandra';
    }
    this.check = this.check.bind(this);
    this.name = this.name.bind(this);
    this.build = this.build.bind(this);
  }
  async check(): Promise<AnyMap> {
    const obj = {} as AnyMap;
    const promise = new Promise<any>(async(resolve, reject) => {
      const state = this.client.getState();
      if(state.getConnectedHosts().length > 0) {
        resolve(obj);
      }else{
        reject(`Database down!`);
      }
    })
    if (this.timeout > 0) {
      return promiseTimeOut(this.timeout, promise);
    } else {
      return promise;
    }
  }
  name(): string {
    return this.service;
  }
  build(data: AnyMap, err: any): AnyMap {
    if (err) {
      if (!data) {
        data = {} as AnyMap;
      }
      data['error'] = err;
    }
    return data;
  }
}

function promiseTimeOut(timeoutInMilliseconds: number, promise: Promise<any>): Promise<any> {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(`Timed out in: ${timeoutInMilliseconds} milliseconds!`);
      }, timeoutInMilliseconds);
    })
  ]);
}

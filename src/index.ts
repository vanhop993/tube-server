import {json} from 'body-parser';
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import http from 'http';
import {createContext} from './init';
import {route} from './route';
import {connectToDb} from './services/cassandra/cassandra';

dotenv.config();

const app = express();

const port = process.env.PORT;
const url = process.env.CASSANDRA_URI.split(", ");
const keyspace = process.env.KEYSPACE;
const localDataCenter = process.env.LOCALDATACENTER;
const userCassandra = process.env.CASSANDRA_USER;
const passwordCassandra = process.env.CASSANDRA_PASS;
const apiKey = process.env.API_KEY;

app.use(json());
app.use((req: Request, res: Response, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
  next();
});
app.use(json());

connectToDb(url, keyspace , localDataCenter ,userCassandra,passwordCassandra).then(db => {
  const ctx = createContext(db,apiKey);
  route(app, ctx);
  http.createServer(app).listen(port, () => {
    console.log('Start server at port ' + port);
  });
});

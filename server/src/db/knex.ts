import knexLib from 'knex';
import knexConfig from './knexfile';

const knex = knexLib(knexConfig);

export default knex;

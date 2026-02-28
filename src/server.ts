import app from './app';
import { config } from './config';
import { seedData } from './store/seed';

if (config.seedData) {
  seedData();
  console.log('Seed data loaded');
}

app.listen(config.port, config.host, () => {
  console.log(`REST Academy running at http://${config.host}:${config.port}`);
  console.log(`Swagger UI: http://${config.host}:${config.port}/api-docs`);
});

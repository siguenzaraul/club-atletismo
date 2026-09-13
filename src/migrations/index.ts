import * as migration_20260831_133622_baseline from './20260831_133622_baseline';
import * as migration_20260831_133632_marcas_personales from './20260831_133632_marcas_personales';
import * as migration_20260913_183541_equipacion_y_patrocinadores from './20260913_183541_equipacion_y_patrocinadores';

export const migrations = [
  {
    up: migration_20260831_133622_baseline.up,
    down: migration_20260831_133622_baseline.down,
    name: '20260831_133622_baseline',
  },
  {
    up: migration_20260831_133632_marcas_personales.up,
    down: migration_20260831_133632_marcas_personales.down,
    name: '20260831_133632_marcas_personales',
  },
  {
    up: migration_20260913_183541_equipacion_y_patrocinadores.up,
    down: migration_20260913_183541_equipacion_y_patrocinadores.down,
    name: '20260913_183541_equipacion_y_patrocinadores'
  },
];

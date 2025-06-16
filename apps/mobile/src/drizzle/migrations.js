// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_gray_puck.sql';
import m0001 from './0001_elite_hellfire_club.sql';
import m0002 from './0002_common_khan.sql';
import m0003 from './0003_equal_skin.sql';
import m0004 from './0004_black_magneto.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
    m0003,
    m0004,
  },
};

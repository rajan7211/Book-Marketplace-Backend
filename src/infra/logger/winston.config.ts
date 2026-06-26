import * as winston from 'winston';
import { utilities as nestWinstonUtilities } from 'nest-winston';

export const winstonConfig = {
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonUtilities.format.nestLike('BookMarketplace', { colors: true, prettyPrint: true }),
  ),
  transports: [new winston.transports.Console()],
};

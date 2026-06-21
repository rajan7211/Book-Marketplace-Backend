import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/decorators';
import { RedisService } from '../../infra/redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness + dependency status' })
  check() {
    // mongoose connection.readyState: 1 = connected
    const mongoUp = this.mongo.readyState === 1;
    return {
      status: mongoUp ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      services: {
        mongodb: mongoUp ? 'up' : 'down',
        redis: this.redis.enabled ? 'up' : 'disabled',
      },
    };
  }
}

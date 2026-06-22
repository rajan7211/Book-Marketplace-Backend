import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ example: '9781847941831' })
  isbn: string;

  @ApiProperty({ example: 'Atomic Habits' })
  title: string;

  @ApiProperty({ example: 'James Clear' })
  author: string;

  @ApiProperty({ example: 'Random House' })
  publisher: string;

  @ApiProperty({ example: 'An easy and proven way to build good habits...' })
  description: string;

  @ApiProperty({ example: 'Self Help' })
  category: string;

  @ApiPropertyOptional({ example: ['bestseller', 'trending'], type: [String] })
  tags?: string[];
}

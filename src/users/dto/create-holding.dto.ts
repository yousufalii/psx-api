import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateHoldingDto {
  @ApiProperty({
    example: 'HINOON',
    description: 'The unique stock symbol (ticker)',
    maxLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  stockSymbol: string;

  @ApiProperty({
    example: 10,
    description: 'The quantity of stocks purchased',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({
    example: 120.5,
    description: 'The purchase price per individual stock unit',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  purchasePrice: number;
}

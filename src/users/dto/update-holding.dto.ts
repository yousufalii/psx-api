import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateHoldingDto {
  @ApiPropertyOptional({
    example: 15,
    description: 'Updated quantity of stocks',
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({
    example: 125,
    description: 'Updated purchase price per stock unit',
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  purchasePrice?: number;
}

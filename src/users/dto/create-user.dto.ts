import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full name of the user',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The unique email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateHoldingDto } from './dto/create-holding.dto';
import { UpdateHoldingDto } from './dto/update-holding.dto';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'The user has been successfully created.',
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiResponse({ status: 200, description: 'Return the user details.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Post(':id/stocks')
  @ApiOperation({ summary: 'Add a stock holding to a user' })
  @ApiResponse({
    status: 201,
    description: 'The stock holding has been successfully added.',
  })
  @ApiResponse({ status: 404, description: 'User or Stock not found.' })
  addStockHolding(
    @Param('id') userId: string,
    @Body() createHoldingDto: CreateHoldingDto,
  ) {
    return this.usersService.addStockHolding(userId, createHoldingDto);
  }

  @Patch(':userId/stocks/:holdingId')
  @ApiOperation({ summary: 'Update a stock holding' })
  @ApiResponse({
    status: 200,
    description: 'The stock holding has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Stock holding not found.' })
  updateStockHolding(
    @Param('holdingId') holdingId: string,
    @Body() updateHoldingDto: UpdateHoldingDto,
  ) {
    return this.usersService.updateStockHolding(holdingId, updateHoldingDto);
  }

  @Delete(':userId/stocks/:holdingId')
  @ApiOperation({ summary: 'Remove a stock holding' })
  @ApiResponse({
    status: 200,
    description: 'The stock holding has been successfully removed.',
  })
  @ApiResponse({ status: 404, description: 'Stock holding not found.' })
  removeStockHolding(@Param('holdingId') holdingId: string) {
    return this.usersService.removeStockHolding(holdingId);
  }

  @Get(':id/portfolio')
  @ApiOperation({ summary: 'Get user portfolio with dynamic calculations' })
  @ApiResponse({ status: 200, description: 'Return the calculated portfolio.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getPortfolio(@Param('id') id: string) {
    return this.usersService.getPortfolio(id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { UpdateStockDto } from './dto/update-stock.dto';
import { SetStockDto } from './dto/set-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SHOP_OWNER', 'ADMIN')
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('init')
  @ApiOperation({ summary: 'Initialize inventory for a product variant' })
  @ApiQuery({ name: 'productVariantId', required: true })
  @ApiQuery({ name: 'shopId', required: true })
  @ApiQuery({ name: 'initialQuantity', required: false, type: Number })
  initializeInventory(
    @Query('productVariantId') productVariantId: string,
    @Query('shopId') shopId: string,
    @Query('initialQuantity') initialQuantity?: number,
  ) {
    return this.inventoryService.initializeInventory(productVariantId, shopId, Number(initialQuantity) || 0);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory ledger and logs' })
  getInventory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inventoryService.getInventory(id, user.id);
  }

  @Patch(':id/update')
  @ApiOperation({ summary: 'Update stock by delta (Sale, Restock, Return)' })
  updateStock(@Param('id') id: string, @Body() updateDto: UpdateStockDto, @CurrentUser() user: any) {
    return this.inventoryService.updateStock(id, user.id, updateDto);
  }

  @Patch(':id/set')
  @ApiOperation({ summary: 'Override stock to an exact quantity' })
  setStock(@Param('id') id: string, @Body() setDto: SetStockDto, @CurrentUser() user: any) {
    return this.inventoryService.setStock(id, user.id, setDto);
  }
}

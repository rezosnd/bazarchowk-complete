import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Place a new order from cart' })
  createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: any) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Post('checkout-preview')
  @ApiOperation({ summary: 'Preview order totals and delivery fee before placing' })
  checkoutPreview(
    @Body('shopId') shopId: string, 
    @Body('deliveryAddressId') deliveryAddressId: string, 
    @Body('useWallet') useWallet: boolean, 
    @CurrentUser() user: any
  ) {
    return this.ordersService.checkoutPreview(user.id, { shopId, deliveryAddressId, useWallet });
  }

  @Get('my-orders')
  @ApiOperation({ summary: 'Get current customer orders' })
  getCustomerOrders(@CurrentUser() user: any) {
    return this.ordersService.getCustomerOrders(user.id);
  }

  @Get('shop/:shopId')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Get orders for a specific shop (Owner/Admin)' })
  getShopOrders(@Param('shopId') shopId: string, @CurrentUser() user: any) {
    return this.ordersService.getShopOrders(shopId, user.id);
  }

  @Get('global')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all platform orders (Admin)' })
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single order by ID' })
  getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SHOP_OWNER', 'ADMIN', 'DELIVERY_PARTNER', 'RIDER')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @CurrentUser() user: any) {
    return this.ordersService.updateOrderStatus(id, user.id, dto);
  }
}

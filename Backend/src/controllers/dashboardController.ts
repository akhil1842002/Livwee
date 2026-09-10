import { Request, Response } from 'express';
import {
  Order,
  OrderSource,
  OrderStatus,
  Return,
  ReturnStatus,
  Inventory,
  Batch,
  Customer,
  PurchaseOrder,
  POStatus,
  AuditLog
} from '../models';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get dashboard metrics computed live from MongoDB
// @route   GET /api/dashboard/metrics
// @access  Private/Admin
export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // 1. Revenue & Sales
    const paidOrders = await Order.find({ payment_status: 'PAID' });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysOrders = await Order.find({
      payment_status: 'PAID',
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    let todayOnlineRevenue = 0;
    let todayPOSRevenue = 0;
    todaysOrders.forEach(order => {
      if (order.source === OrderSource.ONLINE) {
        todayOnlineRevenue += order.total_amount || 0;
      } else {
        todayPOSRevenue += order.total_amount || 0;
      }
    });

    // 2. Order metrics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: { $in: [OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING] } });

    // 3. Inventory & Batches
    const inventory = await Inventory.find({});
    const outOfStockCount = inventory.filter(inv => (inv.current_stock || 0) <= 0).length;
    const lowStockCount = inventory.filter(inv => (inv.current_stock || 0) > 0 && (inv.current_stock || 0) <= (inv.low_stock_threshold || 5)).length;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const nearExpiryBatchesCount = await Batch.countDocuments({
      expiry_date: { $gte: now, $lte: thirtyDaysFromNow }
    });

    // 4. Customers & Purchases / Procurement
    const totalCustomersCount = await Customer.countDocuments({ deleted_at: null });
    const allPurchaseOrders = await PurchaseOrder.find({ status: { $ne: POStatus.CANCELLED } });
    const totalPurchasesSpend = allPurchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const completedPurchasesCount = allPurchaseOrders.filter(po => po.status === POStatus.RECEIVED || po.status === POStatus.CLOSED).length;
    const pendingPurchaseOrders = allPurchaseOrders.filter(po => ['UNPAID', 'PARTIAL', 'PARTIALLY_PAID'].includes(po.payment_status));
    const supplierPayables = pendingPurchaseOrders.reduce((sum, po) => sum + Math.max(0, (po.total_amount || 0) - (po.paid_amount || 0)), 0);

    const recentPOsList = await PurchaseOrder.find({ status: { $ne: POStatus.CANCELLED } }).sort({ createdAt: -1 }).limit(5);
    const recentPurchaseOrders = recentPOsList.map(po => ({
      id: po._id.toString(),
      poNumber: po.po_number || `PO-${po._id.toString().slice(-6)}`,
      supplierName: po.supplier_name || 'Vendor',
      totalAmount: po.total_amount || 0,
      paidAmount: po.paid_amount || 0,
      dueAmount: Math.max(0, (po.total_amount || 0) - (po.paid_amount || 0)),
      status: po.status || 'ORDERED',
      paymentStatus: po.payment_status || 'UNPAID',
      itemsCount: po.items?.length || 0,
      date: po.order_date || ((po as any).createdAt ? new Date((po as any).createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    }));

    // 5. Customer Returns & Refunds
    const returnsList = await Return.find().sort({ createdAt: -1 }).limit(5);
    const totalReturnsCount = await Return.countDocuments();
    const allApprovedReturns = await Return.find({ status: ReturnStatus.REFUNDED });
    const totalRefundsValue = allApprovedReturns.reduce((sum, ret) => sum + (ret.refund_amount || 0), 0);

    const formattedReturns = returnsList.map(ret => ({
      id: ret._id.toString(),
      returnNumber: ret.return_number || `RET-${ret._id.toString().slice(-6)}`,
      date: ret.date || new Date().toISOString().split('T')[0],
      customer: ret.customer_name || 'Walk-in Customer',
      item: ret.returned_item_name || 'Returned Item',
      qty: ret.qty_returned || 1,
      disposition: ret.disposition || 'RESTOCK_INVENTORY',
      refundAmount: ret.refund_amount || 0,
      method: ret.refund_method || 'CASH',
      status: ret.status || 'REFUNDED'
    }));

    // 6. Payment Methods Distribution
    const paymentMethodsAgg = await Order.aggregate([
      { $match: { payment_status: 'PAID' } },
      { $group: { _id: '$payment_method', total: { $sum: '$total_amount' } } }
    ]);

    const totalPaidAmount = totalRevenue || 1;
    const paymentMethodMap: Record<string, number> = {};
    paymentMethodsAgg.forEach(pm => {
      const key = pm._id || 'CASH';
      paymentMethodMap[key] = Math.round(((pm.total || 0) / totalPaidAmount) * 100);
    });

    const paymentMethodData = [
      { name: 'UPI & QR Code', value: paymentMethodMap['UPI'] || 0, color: '#10B981' },
      { name: 'Cash POS', value: paymentMethodMap['CASH'] || 0, color: '#7C3AED' },
      { name: 'Cards (Credit/Debit)', value: paymentMethodMap['CARD'] || 0, color: '#06B6D4' },
      { name: 'Net Banking / NEFT', value: paymentMethodMap['NET_BANKING'] || 0, color: '#F59E0B' },
    ];

    // 7. Monthly Revenue & Purchases Trend (Last 6 Months)
    const monthlyTrend: Array<{ month: string; revenue: number; expenses: number; refunds: number }> = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = monthNames[d.getMonth()];
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const mOrders = await Order.find({
        payment_status: 'PAID',
        createdAt: { $gte: mStart, $lte: mEnd }
      });
      const mRev = mOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      const mPOs = await PurchaseOrder.find({
        status: { $ne: POStatus.CANCELLED },
        createdAt: { $gte: mStart, $lte: mEnd }
      });
      const mExpenses = mPOs.reduce((sum, p) => sum + (p.total_amount || 0), 0);

      const mReturns = await Return.find({
        status: ReturnStatus.REFUNDED,
        createdAt: { $gte: mStart, $lte: mEnd }
      });
      const mRef = mReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

      monthlyTrend.push({
        month: mName,
        revenue: mRev,
        expenses: mExpenses,
        refunds: mRef
      });
    }

    // 8. Activity Log Feed
    const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(6);
    const activityFeed = recentLogs.map(log => ({
      id: log._id.toString(),
      initials: log.action ? log.action.slice(0, 3).toUpperCase() : 'SYS',
      text: `${log.user || 'System'}: ${log.action} on ${log.entity || ''} - ${log.desc || ''}`,
      time: log.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    // 9. Recent POS Invoices
    const recentOrdersList = await Order.find().sort({ createdAt: -1 }).limit(5);
    const recentInvoices = recentOrdersList.map(ord => ({
      id: ord._id.toString(),
      invoiceNumber: ord.order_number || `INV-${ord._id.toString().slice(-6)}`,
      customer: ord.customer_name || 'Walk-in Customer',
      amount: ord.total_amount || 0,
      paidAmount: ord.paid_amount || 0,
      dueAmount: ord.due_amount || 0,
      paymentMethod: ord.payment_method || 'CASH',
      paymentStatus: ord.payment_status || 'PAID',
      itemsCount: ord.items?.length || 0,
      date: (ord as any).createdAt ? new Date((ord as any).createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }));

    res.json({
      success: true,
      revenue: {
        total: totalRevenue,
        today: todayOnlineRevenue + todayPOSRevenue,
        todayOnline: todayOnlineRevenue,
        todayPOS: todayPOSRevenue,
        refunds: totalRefundsValue
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        list: recentInvoices
      },
      inventory: {
        lowStockCount,
        outOfStockCount,
        nearExpiryBatchesCount
      },
      customers: {
        total: totalCustomersCount
      },
      purchases: {
        totalSpend: totalPurchasesSpend,
        completedCount: completedPurchasesCount,
        totalCount: allPurchaseOrders.length,
        supplierPayables,
        list: recentPurchaseOrders
      },
      returns: {
        totalCount: totalReturnsCount,
        totalRefundsValue,
        list: formattedReturns
      },
      paymentMethods: paymentMethodData,
      monthlyTrend,
      activityFeed
    });
  } catch (error: any) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ message: error.message || 'Error fetching dashboard metrics' });
  }
};

// @desc    Get live system notifications derived from low stock, orders, audit logs, and purchase orders
// @route   GET /api/dashboard/notifications
// @access  Private/Admin
export const getLiveNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const notifications: Array<{
      id: string;
      title: string;
      message: string;
      time: string;
      type: 'warning' | 'success' | 'info' | 'critical';
      link?: string;
    }> = [];

    // 1. Low stock items
    const lowStockInventory = await Inventory.find().populate('product_id').limit(5);
    lowStockInventory.forEach(inv => {
      const current = inv.current_stock || 0;
      const threshold = inv.low_stock_threshold || 5;
      if (current <= threshold) {
        const prodName = (inv.product_id as any)?.name || 'Product';
        notifications.push({
          id: `lowstock-${inv._id}`,
          title: current <= 0 ? 'Out of Stock Alert' : 'Low Stock Warning',
          message: `${prodName} has ${current} units remaining (Threshold: ${threshold}).`,
          time: 'Live',
          type: 'warning',
          link: '/inventory/stock'
        });
      }
    });

    // 2. Near expiry batches
    const now = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringBatches = await Batch.find({
      expiry_date: { $lte: thirtyDays }
    }).populate('product_id').limit(5);

    expiringBatches.forEach(batch => {
      const prodName = batch.product_name || (batch.product_id as any)?.name || 'Product Batch';
      const isExpired = new Date(batch.expiry_date) < now;
      notifications.push({
        id: `batch-${batch._id}`,
        title: isExpired ? 'Expired Batch Alert' : 'Batch Expiring Soon',
        message: `Batch #${batch.batch_number || batch._id.toString().slice(-6)} (${prodName}) ${isExpired ? 'expired' : 'expires'} on ${new Date(batch.expiry_date).toLocaleDateString()}.`,
        time: 'Live',
        type: 'warning',
        link: '/inventory/batches'
      });
    });

    // 3. Recent Sales / Orders
    const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(3);
    recentOrders.forEach(ord => {
      const diffMins = Math.floor((Date.now() - new Date((ord as any).createdAt || Date.now()).getTime()) / 60000);
      const timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins} mins ago` : `${Math.floor(diffMins / 60)} hours ago`;
      notifications.push({
        id: `ord-${ord._id}`,
        title: ord.source === OrderSource.ONLINE ? 'Online Order Received' : 'POS Sale Completed',
        message: `Order #${ord.order_number || ord._id.toString().slice(-6)} completed for ₹${(ord.total_amount || 0).toLocaleString()} via ${ord.payment_method || 'CASH'}.`,
        time: timeStr,
        type: 'success',
        link: '/sales/history'
      });
    });

    // 4. Audit & Security logs
    const recentAudits = await AuditLog.find().sort({ createdAt: -1 }).limit(3);
    recentAudits.forEach(log => {
      const diffMins = Math.floor((Date.now() - new Date((log as any).createdAt || Date.now()).getTime()) / 60000);
      const timeStr = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins} mins ago` : `${Math.floor(diffMins / 60)} hours ago`;
      notifications.push({
        id: `audit-${log._id}`,
        title: log.action ? `Security Log: ${log.action}` : 'System Log',
        message: `${log.user || 'User'}: ${log.desc || log.action}`,
        time: timeStr,
        type: log.severity === 'CRITICAL' || log.severity === 'WARNING' ? 'critical' : 'info',
        link: '/audit-logs'
      });
    });

    res.json({
      success: true,
      notifications
    });
  } catch (error: any) {
    console.error('Error fetching live notifications:', error);
    res.status(500).json({ message: error.message || 'Error fetching notifications' });
  }
};

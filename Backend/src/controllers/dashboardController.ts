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

// @desc    Get dashboard metrics computed live from MongoDB with Date Range filter
// @route   GET /api/dashboard/metrics
// @access  Private/Admin
export const getDashboardMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, preset = 'today' } = req.query as {
      startDate?: string;
      endDate?: string;
      preset?: string;
    };

    const now = new Date();
    let rangeStart: Date;
    let rangeEnd: Date;
    let activePreset = (preset as string) || 'today';

    if (startDate && endDate) {
      activePreset = 'custom';
      rangeStart = new Date(startDate);
      if (isNaN(rangeStart.getTime())) rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);

      rangeEnd = new Date(endDate);
      if (isNaN(rangeEnd.getTime())) rangeEnd = new Date();
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      switch (activePreset) {
        case 'today': {
          rangeStart = new Date();
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd = new Date();
          rangeEnd.setHours(23, 59, 59, 999);
          break;
        }
        case 'yesterday': {
          rangeStart = new Date();
          rangeStart.setDate(rangeStart.getDate() - 1);
          rangeStart.setHours(0, 0, 0, 0);

          rangeEnd = new Date();
          rangeEnd.setDate(rangeEnd.getDate() - 1);
          rangeEnd.setHours(23, 59, 59, 999);
          break;
        }
        case '7d': {
          rangeStart = new Date();
          rangeStart.setDate(rangeStart.getDate() - 6);
          rangeStart.setHours(0, 0, 0, 0);

          rangeEnd = new Date();
          rangeEnd.setHours(23, 59, 59, 999);
          break;
        }
        case '30d': {
          rangeStart = new Date();
          rangeStart.setDate(rangeStart.getDate() - 29);
          rangeStart.setHours(0, 0, 0, 0);

          rangeEnd = new Date();
          rangeEnd.setHours(23, 59, 59, 999);
          break;
        }
        case 'this_month': {
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        }
        case 'last_month': {
          rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
          rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        }
        case 'all': {
          rangeStart = new Date(0);
          rangeEnd = new Date('2099-12-31T23:59:59.999Z');
          break;
        }
        default: {
          activePreset = 'today';
          rangeStart = new Date();
          rangeStart.setHours(0, 0, 0, 0);
          rangeEnd = new Date();
          rangeEnd.setHours(23, 59, 59, 999);
          break;
        }
      }
    }

    const dateMatchQuery = activePreset === 'all'
      ? {}
      : { createdAt: { $gte: rangeStart, $lte: rangeEnd } };

    // 1. Revenue & Sales (Gross Sales across all orders created in period)
    const rangeAllOrders = await Order.find(dateMatchQuery);
    const totalRevenue = rangeAllOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const totalCollected = rangeAllOrders.reduce((sum, order) => {
      if (order.paid_amount !== undefined && order.paid_amount !== null) return sum + (order.paid_amount || 0);
      return sum + (order.payment_status === 'PAID' ? (order.total_amount || 0) : 0);
    }, 0);

    // All-time & Today's reference metrics
    const allOrdersList = await Order.find({});
    const allTimeRevenue = allOrdersList.reduce((sum, order) => sum + (order.total_amount || 0), 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todaysOrders = await Order.find({
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
    const totalOrders = await Order.countDocuments(dateMatchQuery);
    const allTimeOrdersCount = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({
      status: { $in: [OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING] },
      ...dateMatchQuery
    });

    // 3. Inventory & Batches (current store status)
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
    const rangePurchaseOrders = await PurchaseOrder.find({
      status: { $ne: POStatus.CANCELLED },
      ...dateMatchQuery
    });
    const totalPurchasesSpend = rangePurchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0);
    const completedPurchasesCount = rangePurchaseOrders.filter(po => po.status === POStatus.RECEIVED || po.status === POStatus.CLOSED).length;
    const pendingPurchaseOrders = rangePurchaseOrders.filter(po => ['UNPAID', 'PARTIAL', 'PARTIALLY_PAID'].includes(po.payment_status));
    const supplierPayables = pendingPurchaseOrders.reduce((sum, po) => sum + Math.max(0, (po.total_amount || 0) - (po.paid_amount || 0)), 0);

    const recentPOsList = await PurchaseOrder.find({
      status: { $ne: POStatus.CANCELLED },
      ...dateMatchQuery
    }).sort({ createdAt: -1 }).limit(10);

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
    const returnsList = await Return.find(dateMatchQuery).sort({ createdAt: -1 }).limit(10);
    const totalReturnsCount = await Return.countDocuments(dateMatchQuery);
    const rangeApprovedReturns = await Return.find({
      status: ReturnStatus.REFUNDED,
      ...dateMatchQuery
    });
    const totalRefundsValue = rangeApprovedReturns.reduce((sum, ret) => sum + (ret.refund_amount || 0), 0);

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

    // 6. Customer Entity Breakdown & Payment Methods Distribution in range
    const rangeOrdersForBreakdown = await Order.find(dateMatchQuery).populate('customer_id');
    
    let walkInRev = 0;
    let walkInCnt = 0;
    let walkInPay = { cash: 0, upi: 0, card: 0, credit: 0 };

    let hospitalRev = 0;
    let hospitalCnt = 0;
    let hospitalPay = { cash: 0, upi: 0, card: 0, credit: 0 };

    let distributorRev = 0;
    let distributorCnt = 0;
    let distributorPay = { cash: 0, upi: 0, card: 0, credit: 0 };

    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let creditTotal = 0;

    rangeOrdersForBreakdown.forEach((ord: any) => {
      const amt = ord.total_amount || 0;
      const pStatus = ord.payment_status || 'PAID';
      const pm = (ord.payment_method || 'CASH').toUpperCase();

      let paid = 0;
      let due = 0;

      if (pStatus === 'PAID') {
        paid = amt;
        due = 0;
      } else if (pStatus === 'UNPAID' || pm === 'CREDIT') {
        paid = ord.paid_amount || 0;
        due = Math.max(0, amt - paid);
      } else if (pStatus === 'PARTIAL') {
        paid = ord.paid_amount || 0;
        due = Math.max(0, amt - paid);
      } else {
        paid = amt;
        due = 0;
      }

      // Add to overall totals
      if (pm === 'UPI') upiTotal += paid;
      else if (pm === 'CARD') cardTotal += paid;
      else if (pm === 'CREDIT') creditTotal += (due + paid);
      else cashTotal += paid;

      if (pm !== 'CREDIT' && due > 0) {
        creditTotal += due;
      }

      // Target category
      const custObj = ord.customer_id;
      const custType = (custObj && custObj.type) ? custObj.type : '';
      const cName = (ord.customer_name || '').toLowerCase();

      let targetPay: { cash: number; upi: number; card: number; credit: number };

      if (custType === 'HOSPITAL' || custType === 'DOCTOR' || custType === 'CLINIC' || cName.includes('hospital') || cName.includes('doctor') || cName.includes('dr.') || cName.includes('clinic')) {
        hospitalRev += amt;
        hospitalCnt += 1;
        targetPay = hospitalPay;
      } else if (custType === 'DISTRIBUTOR' || cName.includes('distributor') || cName.includes('pharma') || cName.includes('agency')) {
        distributorRev += amt;
        distributorCnt += 1;
        targetPay = distributorPay;
      } else {
        walkInRev += amt;
        walkInCnt += 1;
        targetPay = walkInPay;
      }

      if (pm === 'UPI') targetPay.upi += paid;
      else if (pm === 'CARD') targetPay.card += paid;
      else if (pm === 'CREDIT') targetPay.credit += (due + paid);
      else targetPay.cash += paid;

      if (pm !== 'CREDIT' && due > 0) {
        targetPay.credit += due;
      }
    });

    const paymentMethodsAgg = await Order.aggregate([
      { $match: { payment_status: 'PAID', ...dateMatchQuery } },
      { $group: { _id: '$payment_method', total: { $sum: '$total_amount' } } }
    ]);

    const totalPaidAmount = totalRevenue || 1;
    const paymentMethodMap: Record<string, number> = {};
    paymentMethodsAgg.forEach(pm => {
      const key = pm._id || 'CASH';
      paymentMethodMap[key] = Math.round(((pm.total || 0) / totalPaidAmount) * 100);
    });

    const paymentMethodData = [
      { name: 'UPI & QR Code', value: paymentMethodMap['UPI'] || 0, color: '#10B981', amount: upiTotal },
      { name: 'Cash POS', value: paymentMethodMap['CASH'] || 0, color: '#7C3AED', amount: cashTotal },
      { name: 'Cards (Credit/Debit)', value: paymentMethodMap['CARD'] || 0, color: '#06B6D4', amount: cardTotal },
      { name: 'On Credit (Due)', value: paymentMethodMap['CREDIT'] || 0, color: '#EF4444', amount: creditTotal },
    ];

    // 7. Dynamic Trend Calculation based on date range
    const trendData: Array<{ label: string; revenue: number; expenses: number; refunds: number }> = [];
    const diffMs = rangeEnd.getTime() - rangeStart.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 1 && activePreset !== 'all') {
      // Hourly breakdown for single day
      const hours = [0, 4, 8, 12, 16, 20, 24];
      for (let i = 0; i < hours.length - 1; i++) {
        const hStart = new Date(rangeStart);
        hStart.setHours(hours[i], 0, 0, 0);
        const hEnd = new Date(rangeStart);
        if (hours[i + 1] === 24) {
          hEnd.setHours(23, 59, 59, 999);
        } else {
          hEnd.setHours(hours[i + 1] - 1, 59, 59, 999);
        }

        const hOrders = await Order.find({ payment_status: 'PAID', createdAt: { $gte: hStart, $lte: hEnd } });
        const hRev = hOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const hPOs = await PurchaseOrder.find({ status: { $ne: POStatus.CANCELLED }, createdAt: { $gte: hStart, $lte: hEnd } });
        const hExp = hPOs.reduce((sum, p) => sum + (p.total_amount || 0), 0);

        const hReturns = await Return.find({ status: ReturnStatus.REFUNDED, createdAt: { $gte: hStart, $lte: hEnd } });
        const hRef = hReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

        const label = `${String(hours[i]).padStart(2, '0')}:00`;
        trendData.push({ label, revenue: hRev, expenses: hExp, refunds: hRef });
      }
    } else if (diffDays <= 31 && activePreset !== 'all') {
      // Daily breakdown
      const cur = new Date(rangeStart);
      while (cur <= rangeEnd) {
        const dStart = new Date(cur);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(cur);
        dEnd.setHours(23, 59, 59, 999);

        const dOrders = await Order.find({ payment_status: 'PAID', createdAt: { $gte: dStart, $lte: dEnd } });
        const dRev = dOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const dPOs = await PurchaseOrder.find({ status: { $ne: POStatus.CANCELLED }, createdAt: { $gte: dStart, $lte: dEnd } });
        const dExp = dPOs.reduce((sum, p) => sum + (p.total_amount || 0), 0);

        const dReturns = await Return.find({ status: ReturnStatus.REFUNDED, createdAt: { $gte: dStart, $lte: dEnd } });
        const dRef = dReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

        const label = dStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        trendData.push({ label, revenue: dRev, expenses: dExp, refunds: dRef });

        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Monthly breakdown
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mName = monthNames[d.getMonth()];
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const mOrders = await Order.find({ payment_status: 'PAID', createdAt: { $gte: mStart, $lte: mEnd } });
        const mRev = mOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

        const mPOs = await PurchaseOrder.find({ status: { $ne: POStatus.CANCELLED }, createdAt: { $gte: mStart, $lte: mEnd } });
        const mExpenses = mPOs.reduce((sum, p) => sum + (p.total_amount || 0), 0);

        const mReturns = await Return.find({ status: ReturnStatus.REFUNDED, createdAt: { $gte: mStart, $lte: mEnd } });
        const mRef = mReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

        trendData.push({ label: mName, revenue: mRev, expenses: mExpenses, refunds: mRef });
      }
    }

    // 8. Activity Log Feed
    const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(6);
    const activityFeed = recentLogs.map(log => ({
      id: log._id.toString(),
      initials: log.action ? log.action.slice(0, 3).toUpperCase() : 'SYS',
      text: `${log.user || 'System'}: ${log.action} on ${log.entity || ''} - ${log.desc || ''}`,
      time: log.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));

    // 9. Recent POS Invoices in range
    const recentOrdersList = await Order.find(dateMatchQuery).sort({ createdAt: -1 }).limit(10);
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

    const formattedStart = rangeStart.toISOString().split('T')[0];
    const formattedEnd = rangeEnd.toISOString().split('T')[0];

    res.json({
      success: true,
      filter: {
        preset: activePreset,
        startDate: formattedStart,
        endDate: formattedEnd,
        label: activePreset === 'today'
          ? 'Today'
          : activePreset === 'all'
          ? 'All Time'
          : `${formattedStart} to ${formattedEnd}`
      },
      revenue: {
        total: totalRevenue,
        totalCollected: totalCollected,
        allTime: allTimeRevenue,
        today: todayOnlineRevenue + todayPOSRevenue,
        todayOnline: todayOnlineRevenue,
        todayPOS: todayPOSRevenue,
        refunds: totalRefundsValue
      },
      orders: {
        total: totalOrders,
        allTimeTotal: allTimeOrdersCount,
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
        totalCount: rangePurchaseOrders.length,
        supplierPayables,
        list: recentPurchaseOrders
      },
      returns: {
        totalCount: totalReturnsCount,
        totalRefundsValue,
        list: formattedReturns
      },
      categoryBreakdown: {
        walkIn: { revenue: walkInRev, count: walkInCnt, payments: walkInPay },
        hospital: { revenue: hospitalRev, count: hospitalCnt, payments: hospitalPay },
        distributor: { revenue: distributorRev, count: distributorCnt, payments: distributorPay }
      },
      paymentBreakdown: {
        cash: cashTotal,
        upi: upiTotal,
        card: cardTotal,
        credit: creditTotal
      },
      paymentMethods: paymentMethodData,
      monthlyTrend: trendData.map(t => ({
        month: t.label,
        revenue: t.revenue,
        expenses: t.expenses,
        refunds: t.refunds
      })),
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

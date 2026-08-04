import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  Tag,
  BarChart3,
  Settings,
  Bell,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Printer,
  Volume2,
  VolumeX,
  Flame,
  Check,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Edit2,
  Power,
  Store,
  DollarSign,
  Users,
  Filter,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { storeService } from './services/store';
import { audioService } from './services/audio';
import { MenuItem, Order, OrderStatus, Coupon } from './types';
import { ThermalReceipt } from './components/ThermalReceipt';

export function App() {
  const subscribeStore = useCallback((cb: () => void) => storeService.subscribe(cb), []);
  const getMenu = useCallback(() => storeService.getMenu(), []);
  const getOrders = useCallback(() => storeService.getOrders(), []);
  const getCoupons = useCallback(() => storeService.getCoupons(), []);
  const getConfig = useCallback(() => storeService.getConfig(), []);
  const getUser = useCallback(() => storeService.getUser(), []);

  // Sync state from storeService
  const menu = useSyncExternalStore(subscribeStore, getMenu);
  const orders = useSyncExternalStore(subscribeStore, getOrders);
  const coupons = useSyncExternalStore(subscribeStore, getCoupons);
  const config = useSyncExternalStore(subscribeStore, getConfig);
  const user = useSyncExternalStore(subscribeStore, getUser);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'orders' | 'menu' | 'coupons' | 'analytics' | 'settings'>('dashboard');
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // POS State
  const [posCategory, setPosCategory] = useState<string>('All');
  const [posSearch, setPosSearch] = useState<string>('');
  const [posVegOnly, setPosVegOnly] = useState<boolean>(false);
  const [posCart, setPosCart] = useState<{ item: MenuItem; quantity: number; notes: string }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posCustomerPhone, setPosCustomerPhone] = useState<string>('');
  const [posTableNo, setPosTableNo] = useState<string>('4');
  const [posOrderType, setPosOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'cod'>('upi');
  const [posDiscount, setPosDiscount] = useState<number>(0);

  // Orders Filter State
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // Menu Modal State
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: 250,
    category: 'Mains',
    image: '',
    is_veg: true,
    is_bestseller: false,
    prep_time: 20,
  });

  // Coupon Modal State
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_type: 'flat' as 'flat' | 'percent',
    discount_value: 50,
    min_order: 300,
  });

  const categories = Array.from(new Set(['All', ...menu.map((i) => i.category).filter(Boolean)]));

  const pendingOrdersCount = storeService.getPendingOrdersCount();
  const todayRevenue = storeService.getTodayRevenue();

  // Handle adding item to POS cart
  const addToPosCart = (item: MenuItem) => {
    if (!item.in_stock) return;
    setPosCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1, notes: '' }];
    });
  };

  const updatePosQty = (itemId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as { item: MenuItem; quantity: number; notes: string }[]
    );
  };

  const handlePlacePosOrder = () => {
    if (posCart.length === 0) return;

    const newOrder = storeService.createPOSOrder({
      customer_name: posCustomerName || 'Walk-in Customer',
      customer_phone: posCustomerPhone || '+91 98765 00000',
      table_no: posOrderType === 'dine_in' ? posTableNo : undefined,
      order_type: posOrderType,
      items: posCart,
      payment_method: posPaymentMethod,
      discount: posDiscount,
    });

    // Reset POS form
    setPosCart([]);
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosDiscount(0);

    // Show thermal receipt
    setReceiptOrder(newOrder);
  };

  // Add/Edit Menu Item Handler
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name || itemForm.price <= 0) return;

    if (editingItem) {
      storeService.updateMenuItem(editingItem.id, itemForm);
    } else {
      storeService.addMenuItem({
        name: itemForm.name,
        description: itemForm.description,
        price: itemForm.price,
        category: itemForm.category,
        image: itemForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
        in_stock: true,
        is_veg: itemForm.is_veg,
        is_bestseller: itemForm.is_bestseller,
        rating: 4.5,
        prep_time: itemForm.prep_time,
      });
    }

    setIsAddItemOpen(false);
    setEditingItem(null);
    setItemForm({
      name: '',
      description: '',
      price: 250,
      category: 'Mains',
      image: '',
      is_veg: true,
      is_bestseller: false,
      prep_time: 20,
    });
  };

  // Status color helper
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'received':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3.5 h-3.5" /> Received</span>;
      case 'preparing':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Flame className="w-3.5 h-3.5" /> Preparing</span>;
      case 'ready':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>;
      case 'delivered':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><Check className="w-3.5 h-3.5" /> Delivered</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> Cancelled</span>;
    }
  };

  // Recharts analytics data prep
  const salesChartData = [
    { time: '12 PM', sales: 1200 },
    { time: '2 PM', sales: 2800 },
    { time: '4 PM', sales: 1900 },
    { time: '6 PM', sales: 4200 },
    { time: '8 PM', sales: 6800 },
    { time: '10 PM', sales: 5100 },
  ];

  const orderStatusPieData = [
    { name: 'Delivered', value: orders.filter((o) => o.status === 'delivered').length || 12, color: '#10b981' },
    { name: 'Preparing', value: orders.filter((o) => o.status === 'preparing').length || 4, color: '#3b82f6' },
    { name: 'Received', value: orders.filter((o) => o.status === 'received').length || 2, color: '#f59e0b' },
    { name: 'Cancelled', value: orders.filter((o) => o.status === 'cancelled').length || 1, color: '#f43f5e' },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-zinc-950 shadow-lg shadow-amber-500/20 font-black text-xl">
                M
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight text-zinc-100 leading-none">{config.name}</h1>
                <p className="text-[11px] text-amber-400 font-medium mt-1">Admin & POS Control</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </div>
              {pendingOrdersCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${activeTab === 'dashboard' ? 'bg-zinc-950 text-amber-400' : 'bg-amber-500 text-zinc-950'}`}>
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pos')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'pos'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-4 h-4" />
                <span>Offline POS</span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-amber-500/20">
                Billing
              </span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4" />
                <span>Live Orders</span>
              </div>
              <span className="text-xs font-bold text-zinc-500">{orders.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('menu')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'menu'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Menu & Stock</span>
            </button>

            <button
              onClick={() => setActiveTab('coupons')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'coupons'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Coupons & Offers</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics & Sales</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={user?.avatar} alt={user?.name} className="w-8 h-8 rounded-full object-cover border border-amber-500/30" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-zinc-100 truncate">{user?.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Online" />
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP BAR HEADER */}
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
          {/* Accepting Orders Switch */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => storeService.updateConfig({ is_accepting_orders: !config.is_accepting_orders })}
              className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition ${
                config.is_accepting_orders
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{config.is_accepting_orders ? 'Kitchen ONLINE' : 'Kitchen OFF-AIR'}</span>
            </button>

            {/* Test Sound Alarm */}
            <button
              onClick={() => audioService.playNewOrderAlarm()}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-amber-500/30 transition"
              title="Test Kitchen Sound Chime"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Test Alarm Sound</span>
            </button>
          </div>

          {/* Quick Actions & Simulation */}
          <div className="flex items-center gap-3">
            {/* Simulate Incoming Customer Order */}
            <button
              onClick={() => storeService.addSampleIncomingOrder()}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Simulate Online Order</span>
            </button>

            {/* Pending Alert Badge */}
            <div
              onClick={() => setActiveTab('orders')}
              className="relative p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 cursor-pointer transition border border-zinc-700/50"
            >
              <Bell className="w-4 h-4" />
              {pendingOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center animate-bounce">
                  {pendingOrdersCount}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE TAB CONTENT BODY */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Revenue</span>
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-zinc-100">{config.currency}{todayRevenue.toLocaleString()}</h3>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <TrendingUp className="w-3.5 h-3.5" /> +18.4% from yesterday
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Orders</span>
                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                      <Receipt className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-zinc-100">{orders.length} Orders</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {orders.filter((o) => o.order_type === 'dine_in').length} Dine-in · {orders.filter((o) => o.order_type === 'delivery').length} Delivery
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Acceptance</span>
                    <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-zinc-100">{pendingOrdersCount}</h3>
                    <p className="text-xs text-rose-400 mt-1 font-medium">Needs immediate kitchen response</p>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Menu Items</span>
                    <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-black text-zinc-100">{menu.filter((m) => m.in_stock).length} / {menu.length}</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {menu.filter((m) => !m.in_stock).length} items currently out of stock
                    </p>
                  </div>
                </div>
              </div>

              {/* Table Live Grid & Sales Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Tables Grid */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">Dining Floor Tables</h3>
                    <span className="text-xs text-zinc-400">12 Tables Total</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((tableNum) => {
                      const isOccupied = orders.some(
                        (o) => o.table_no === `Table ${tableNum}` && ['received', 'preparing', 'ready'].includes(o.status)
                      );
                      return (
                        <div
                          key={tableNum}
                          onClick={() => {
                            setPosTableNo(String(tableNum));
                            setActiveTab('pos');
                          }}
                          className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                            isOccupied
                              ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <p className="text-xs font-extrabold">T-{tableNum}</p>
                          <p className="text-[10px] mt-1 font-semibold">{isOccupied ? 'Occupied' : 'Vacant'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider">Hourly Revenue Curve</h3>
                    <span className="text-xs text-emerald-400 font-semibold">Peak: 8:00 PM</span>
                  </div>
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={salesChartData}>
                        <defs>
                          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="time" stroke="#71717a" fontSize={11} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', borderRadius: '8px', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Recent Active Orders Stream */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-100">Live Kitchen Orders</h3>
                    <p className="text-xs text-zinc-400">Manage order statuses in real time</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                  >
                    View All Orders <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-zinc-800">
                  {orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="py-3.5 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-extrabold text-amber-400 text-xs border border-zinc-700">
                          {order.table_no || order.order_type?.substring(0, 3).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100">{order.user_name} <span className="text-xs text-zinc-500 font-mono">({order.order_no})</span></p>
                          <p className="text-xs text-zinc-400">{order.items.length} Items · {order.payment_method.toUpperCase()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-amber-400">{config.currency}{order.total}</span>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === 'received' && (
                          <button
                            onClick={() => storeService.updateOrderStatus(order.id, 'preparing')}
                            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-xs transition"
                          >
                            Accept & Cook
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => storeService.updateOrderStatus(order.id, 'ready')}
                            className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs transition"
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            onClick={() => storeService.updateOrderStatus(order.id, 'delivered')}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition"
                          >
                            Mark Delivered
                          </button>
                        )}
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition"
                          title="Print Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OFFLINE POS TERMINAL */}
          {activeTab === 'pos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-7rem)] max-w-7xl mx-auto">
              {/* Left Column: Menu Item Selector */}
              <div className="lg:col-span-2 flex flex-col min-h-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                {/* Search & Filters */}
                <div className="space-y-3 pb-3 border-b border-zinc-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-3 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search dish name or code..."
                        value={posSearch}
                        onChange={(e) => setPosSearch(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => setPosVegOnly(!posVegOnly)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                        posVegOnly
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      🌱 Veg Only
                    </button>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setPosCategory(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                          posCategory === cat
                            ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                            : 'bg-zinc-950/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Grid */}
                <div className="flex-1 overflow-y-auto pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 pr-1">
                  {menu
                    .filter((item) => (posCategory === 'All' ? true : item.category === posCategory))
                    .filter((item) => (posVegOnly ? item.is_veg : true))
                    .filter((item) => item.name.toLowerCase().includes(posSearch.toLowerCase()))
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => addToPosCart(item)}
                        className={`p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition group ${
                          item.in_stock
                            ? 'bg-zinc-950/70 border-zinc-800/80 hover:border-amber-500/50 hover:bg-zinc-900'
                            : 'bg-zinc-950/30 border-zinc-900 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="relative mb-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-24 object-cover rounded-xl border border-zinc-800 group-hover:scale-[1.02] transition"
                          />
                          <span
                            className={`absolute top-1.5 left-1.5 w-3 h-3 rounded-full border border-white/20 ${
                              item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                          />
                          {!item.in_stock && (
                            <span className="absolute inset-0 bg-black/70 backdrop-blur-xs rounded-xl flex items-center justify-center text-[10px] font-black text-rose-400 uppercase">
                              Out of Stock
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-zinc-100 line-clamp-1">{item.name}</h4>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-extrabold text-amber-400 text-xs">{config.currency}{item.price}</span>
                            <span className="text-[10px] text-zinc-500">{item.prep_time}m prep</span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: POS Billing Cart */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col min-h-0 justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <h3 className="font-extrabold text-sm text-zinc-100 uppercase tracking-wider">Current Bill</h3>
                    <span className="text-xs text-zinc-400 font-mono">{posCart.length} Items</span>
                  </div>

                  {/* Customer & Order Type Inputs */}
                  <div className="grid grid-cols-2 gap-2 my-3">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setPosOrderType(type)}
                        className={`py-1.5 text-[11px] font-bold rounded-xl capitalize transition ${
                          posOrderType === type
                            ? 'bg-amber-500 text-zinc-950'
                            : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                        }`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {posOrderType === 'dine_in' && (
                    <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-800 mb-3">
                      <span className="text-xs text-zinc-400 font-semibold">Select Table No:</span>
                      <select
                        value={posTableNo}
                        onChange={(e) => setPosTableNo(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 text-amber-400 text-xs font-bold px-2 py-1 rounded-lg focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={String(n)}>
                            Table {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Cart Items List */}
                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/60">
                    {posCart.length === 0 ? (
                      <div className="py-10 text-center text-zinc-500 text-xs">
                        Click dishes on the left to build order
                      </div>
                    ) : (
                      posCart.map((cartItem) => (
                        <div key={cartItem.item.id} className="pt-2 flex items-center justify-between text-xs">
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-zinc-200 truncate">{cartItem.item.name}</p>
                            <p className="text-[10px] text-zinc-400">{config.currency}{cartItem.item.price} each</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-zinc-800 rounded-lg bg-zinc-950">
                              <button
                                onClick={() => updatePosQty(cartItem.item.id, -1)}
                                className="px-2 py-0.5 text-zinc-400 hover:text-white"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold text-amber-400">{cartItem.quantity}</span>
                              <button
                                onClick={() => updatePosQty(cartItem.item.id, 1)}
                                className="px-2 py-0.5 text-zinc-400 hover:text-white"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-bold text-zinc-100 min-w-[50px] text-right">
                              {config.currency}{cartItem.item.price * cartItem.quantity}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* POS Summary & Checkout */}
                <div className="pt-3 border-t border-zinc-800 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Subtotal:</span>
                    <span>{config.currency}{posCart.reduce((sum, i) => sum + i.item.price * i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Tax ({config.tax_percent}%):</span>
                    <span>
                      +{config.currency}
                      {Math.round((posCart.reduce((sum, i) => sum + i.item.price * i.quantity, 0) * config.tax_percent) / 100)}
                    </span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Payment Mode</span>
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {(['cash', 'upi', 'card', 'cod'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setPosPaymentMethod(mode)}
                          className={`py-1 text-[10px] font-bold uppercase rounded-lg transition ${
                            posPaymentMethod === mode
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-zinc-950 text-zinc-500 border border-zinc-800'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={posCart.length === 0}
                    onClick={handlePlacePosOrder}
                    className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-extrabold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Place & Print Receipt ({config.currency}{
                      Math.max(
                        0,
                        posCart.reduce((sum, i) => sum + i.item.price * i.quantity, 0) +
                        Math.round((posCart.reduce((sum, i) => sum + i.item.price * i.quantity, 0) * config.tax_percent) / 100) -
                        posDiscount
                      )
                    })</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE ORDERS QUEUE */}
          {activeTab === 'orders' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Order Status Tabs & Search */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {['all', 'received', 'preparing', 'ready', 'delivered', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${
                        orderStatusFilter === st
                          ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                          : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {st} ({st === 'all' ? orders.length : orders.filter((o) => o.status === st).length})
                    </button>
                  ))}
                </div>

                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search order no, phone..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Order Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders
                  .filter((o) => (orderStatusFilter === 'all' ? true : o.status === orderStatusFilter))
                  .filter((o) => o.order_no.toLowerCase().includes(orderSearchQuery.toLowerCase()) || o.user_name.toLowerCase().includes(orderSearchQuery.toLowerCase()))
                  .map((order) => (
                    <div key={order.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                      {/* Header */}
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-amber-400 font-extrabold">{order.order_no}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <h4 className="text-sm font-extrabold text-zinc-100 mt-2">{order.user_name}</h4>
                        <p className="text-xs text-zinc-400">{order.user_phone} · {order.address}</p>
                      </div>

                      {/* Item Breakdown */}
                      <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800/80 space-y-1.5 text-xs">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-zinc-300">
                            <span><strong className="text-amber-400">{item.quantity}x</strong> {item.name}</span>
                            <span className="font-mono text-zinc-400">{config.currency}{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-zinc-800 flex justify-between font-extrabold text-zinc-100">
                          <span>Total Amount ({order.payment_method.toUpperCase()})</span>
                          <span className="text-amber-400">{config.currency}{order.total}</span>
                        </div>
                      </div>

                      {/* Action Progression Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                        <button
                          onClick={() => setReceiptOrder(order)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>

                        <div className="flex items-center gap-1.5">
                          {order.status === 'received' && (
                            <button
                              onClick={() => storeService.updateOrderStatus(order.id, 'preparing')}
                              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition"
                            >
                              Accept
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => storeService.updateOrderStatus(order.id, 'ready')}
                              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl text-xs transition"
                            >
                              Ready
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => storeService.updateOrderStatus(order.id, 'delivered')}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition"
                            >
                              Deliver
                            </button>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <button
                              onClick={() => storeService.updateOrderStatus(order.id, 'cancelled')}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 4: MENU & STOCK MANAGEMENT */}
          {activeTab === 'menu' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-100">Restaurant Menu Catalog</h3>
                  <p className="text-xs text-zinc-400">Toggle instant stock availability or add dishes</p>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    setItemForm({ name: '', description: '', price: 250, category: 'Mains', image: '', is_veg: true, is_bestseller: false, prep_time: 20 });
                    setIsAddItemOpen(true);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" /> Add New Dish
                </button>
              </div>

              {/* Menu Items Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400 uppercase tracking-wider">
                      <th className="p-4">Dish</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 text-center">In Stock Toggle</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 text-sm">
                    {menu.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                        <td className="p-4 flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-zinc-800" />
                          <div>
                            <p className="font-bold text-zinc-100 flex items-center gap-2">
                              {item.name}
                              {item.is_bestseller && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Bestseller
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-zinc-400 line-clamp-1">{item.description}</p>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-zinc-300 text-xs">{item.category}</td>
                        <td className="p-4 font-extrabold text-amber-400">{config.currency}{item.price}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${item.is_veg ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                            {item.is_veg ? 'VEG' : 'NON-VEG'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => storeService.toggleStockItem(item.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                              item.in_stock
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            {item.in_stock ? 'In Stock' : 'Out of Stock'}
                          </button>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setItemForm({
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  category: item.category,
                                  image: item.image || '',
                                  is_veg: item.is_veg,
                                  is_bestseller: item.is_bestseller,
                                  prep_time: item.prep_time,
                                });
                                setIsAddItemOpen(true);
                              }}
                              className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => storeService.deleteMenuItem(item.id)}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: COUPONS & PROMOTIONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                <div>
                  <h3 className="font-extrabold text-base text-zinc-100">Discounts & Vouchers</h3>
                  <p className="text-xs text-zinc-400">Manage promotional coupons for walk-in and online orders</p>
                </div>
                <button
                  onClick={() => setIsAddCouponOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Plus className="w-4 h-4" /> Create Coupon
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.map((coupon) => (
                  <div key={coupon.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-base font-black text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        {coupon.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${coupon.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {coupon.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xl font-extrabold text-zinc-100">
                        {coupon.discount_type === 'flat' ? `${config.currency}${coupon.discount_value} OFF` : `${coupon.discount_value}% OFF`}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Min Order: {config.currency}{coupon.min_order} · Used {coupon.uses} times
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: ANALYTICS & SALES */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Breakdown Pie */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider mb-4">Order Status Breakdown</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={orderStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                          {orderStatusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular Dish Leaderboard */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <h3 className="font-extrabold text-sm text-zinc-200 uppercase tracking-wider mb-4">Top Selling Dishes</h3>
                  <div className="space-y-3">
                    {menu.slice(0, 5).map((dish, i) => (
                      <div key={dish.id} className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-amber-400 text-xs w-4">#{i + 1}</span>
                          <div>
                            <p className="font-bold text-xs text-zinc-100">{dish.name}</p>
                            <p className="text-[10px] text-zinc-500">{dish.category}</p>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">{config.currency}{dish.price * (12 - i * 2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SETTINGS & CONFIG */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-extrabold text-lg text-zinc-100 border-b border-zinc-800 pb-3">Restaurant Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400">Restaurant Name</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => storeService.updateConfig({ name: e.target.value })}
                      className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400">Phone</label>
                    <input
                      type="text"
                      value={config.phone}
                      onChange={(e) => storeService.updateConfig({ phone: e.target.value })}
                      className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400">Address</label>
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => storeService.updateConfig({ address: e.target.value })}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-zinc-400">GST Number</label>
                    <input
                      type="text"
                      value={config.gst_no}
                      onChange={(e) => storeService.updateConfig({ gst_no: e.target.value })}
                      className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400">Tax Percent (%)</label>
                    <input
                      type="number"
                      value={config.tax_percent}
                      onChange={(e) => storeService.updateConfig({ tax_percent: Number(e.target.value) })}
                      className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-zinc-200">Sound Notifications</p>
                    <p className="text-xs text-zinc-400">Play audio chime on new orders</p>
                  </div>
                  <button
                    onClick={() => storeService.updateConfig({ sound_notifications_enabled: !config.sound_notifications_enabled })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      config.sound_notifications_enabled ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {config.sound_notifications_enabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-800">
                  <button
                    onClick={() => storeService.resetToDefaults()}
                    className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl text-xs font-bold border border-rose-500/30 transition"
                  >
                    Reset Demo State to Initial Defaults
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {isAddItemOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-extrabold text-base text-zinc-100">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
              <button onClick={() => setIsAddItemOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveMenuItem} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400">Dish Name</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-400">Price ({config.currency})</label>
                  <input
                    type="number"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400">Category</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    {categories.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={itemForm.is_veg}
                    onChange={(e) => setItemForm({ ...itemForm, is_veg: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  Vegetarian Dish
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={itemForm.is_bestseller}
                    onChange={(e) => setItemForm({ ...itemForm, is_bestseller: e.target.checked })}
                    className="rounded text-amber-500"
                  />
                  Bestseller Badge
                </label>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl text-sm transition"
              >
                Save Dish to Menu
              </button>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL PRINT RECEIPT MODAL */}
      <ThermalReceipt order={receiptOrder} config={config} onClose={() => setReceiptOrder(null)} />
    </div>
  );
}

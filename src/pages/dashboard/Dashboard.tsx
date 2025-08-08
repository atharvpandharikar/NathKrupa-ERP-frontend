import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, FileText, IndianRupee, ShoppingCart, BarChart3, Package } from "lucide-react";

export default function Dashboard() {
  const quotations = JSON.parse(localStorage.getItem('nk:quotes') || '[]');
  
  useEffect(() => {
    document.title = "Dashboard | Nathkrupa ERP";
  }, []);

  const dashboardMetrics = [
    {
      title: "Total Revenue",
      value: "₹12,53,430.00",
      change: "+12.5%",
      trend: "up",
      description: "Trending up this month",
      icon: IndianRupee,
      color: "text-primary"
    },
    {
      title: "Active Customers", 
      value: "1,234",
      change: "-20%",
      trend: "down",
      description: "Down 20% this period",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Total Quotations",
      value: quotations.length.toString(),
      change: "+12.5%", 
      trend: "up",
      description: "Strong user retention",
      icon: FileText,
      color: "text-green-600"
    },
    {
      title: "Growth Rate",
      value: "4.5%",
      change: "+4.5%",
      trend: "up", 
      description: "Steady performance",
      icon: BarChart3,
      color: "text-purple-600"
    }
  ];

  const recentOrders = [
    { id: "RFQCART1787", project: "1820-6-3261- 3 rd.", status: "In Production", items: 18, date: "Jul 31, 2025" },
    { id: "RFQCART1725", project: "RE:1820-3261- 2 nd.", status: "In Production", items: 87, date: "Jul 16, 2025" },
    { id: "RFQCART1721", project: "1820-3261-04-07-2025", status: "In Production", items: 36, date: "Jul 14, 2025" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome, Nathkrupa ERP</h1>
          <p className="text-muted-foreground">Review key insights and metrics for your organization below.</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-2 text-xs">
                <div className={`flex items-center ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {metric.change}
                </div>
                <span className="text-muted-foreground">vs last month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* In-Process Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              In-Process Orders
            </CardTitle>
            <CardDescription>Recent orders currently in production</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{order.id}</div>
                  <div className="text-sm text-muted-foreground">{order.project}</div>
                  <div className="text-xs text-muted-foreground">{order.date}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{order.items} items</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>System overview and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Active Users</span>
              </div>
              <span className="font-semibold">165</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-orange-600" />
                <span className="text-sm">Pending Orders</span>
              </div>
              <span className="font-semibold">167</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm">Growth Rate</span>
              </div>
              <span className="font-semibold">+8.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Low Stock Items</span>
              </div>
              <span className="font-semibold text-red-600">16</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

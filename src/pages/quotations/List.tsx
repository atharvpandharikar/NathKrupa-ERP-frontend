import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Users, TrendingUp, DollarSign } from "lucide-react";
import { listQuotations } from "@/mock/data";
import type { QuotationCreated } from "@/types";

export default function QuotationsList() {
  const [quotations, setQuotations] = useState<QuotationCreated[]>([]);

  useEffect(() => {
    document.title = "Quotations | Nathkrupa ERP";
    setQuotations(listQuotations());
  }, []);

  const totalQuotes = quotations.length;
  const totalValue = quotations.reduce((sum, q) => sum + q.total, 0);
  const pendingQuotes = quotations.filter(q => !q.customer).length;
  const avgValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  const handleAddQuote = () => {
    window.open('/quotations/generate', '_blank');
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage and track your vehicle quotations</p>
        </div>
        <Button onClick={handleAddQuote} className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Add Quote
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quotations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-orange-600">+3</span> this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{avgValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+5%</span> improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Quote ID</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Vehicle</th>
                  <th className="text-left p-3 font-medium">Total</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quote) => (
                  <tr key={quote.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <span className="font-mono text-sm text-blue-600">{quote.id}</span>
                    </td>
                    <td className="p-3">
                      {quote.customer ? (
                        <div>
                          <div className="font-medium">{quote.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{quote.customer.phone}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No customer</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {quote.vehicle.typeId && quote.vehicle.makerId ? (
                          <>Type: {quote.vehicle.typeId}, Maker: {quote.vehicle.makerId}</>
                        ) : (
                          <span className="text-muted-foreground">Not configured</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-green-600">₹{quote.total.toLocaleString()}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{new Date(quote.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={quote.customer ? "default" : "secondary"}>
                        {quote.customer ? "Complete" : "Draft"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/quotations/${quote.id}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No quotations found. Create your first quote to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
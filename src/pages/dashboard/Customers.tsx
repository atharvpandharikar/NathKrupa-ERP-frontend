import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, UserCheck, UserX, TrendingUp, Plus, Phone, Mail, MapPin, Search } from "lucide-react";
import { customers } from "@/mock/data";
import { toast } from "@/hooks/use-toast";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: ""
  });

  useEffect(() => {
    document.title = "Customers | Nathkrupa ERP";
  }, []);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCustomers = customers.length;
  const verifiedCustomers = customers.filter(c => c.email).length;
  const unverifiedCustomers = totalCustomers - verifiedCustomers;
  const avgCompletion = (verifiedCustomers / totalCustomers) * 100;

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      toast({ title: "Missing fields", description: "Name and Phone are required" });
      return;
    }
    toast({ title: "Customer added", description: "Customer has been successfully added" });
    setNewCustomer({ name: "", phone: "", whatsapp: "", email: "", address: "" });
    setIsAddCustomerOpen(false);
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Customer Profiles</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage customer profile details effortlessly</p>
        </div>
        <Sheet open={isAddCustomerOpen} onOpenChange={setIsAddCustomerOpen}>
          <SheetTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add New Customer Profile
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add New Customer</SheetTitle>
              <SheetDescription>
                Fill in the details to add a new customer profile.
              </SheetDescription>
            </SheetHeader>
            <form onSubmit={handleAddCustomer} className="space-y-4 mt-6">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  placeholder="Enter customer name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Phone *</label>
                <Input
                  placeholder="Enter phone number"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">WhatsApp</label>
                <Input
                  placeholder="Enter WhatsApp number"
                  value={newCustomer.whatsapp}
                  onChange={(e) => setNewCustomer({...newCustomer, whatsapp: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Address</label>
                <Input
                  placeholder="Enter customer address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
              <Button type="submit" className="w-full">
                Add Customer
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search customers by email or organization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-muted/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              ↗ 23%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete Profiles</CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCustomers}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              ↗ 56%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete Profiles</CardTitle>
            <UserX className="h-5 w-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unverifiedCustomers}</div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              ↘ 18%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgCompletion.toFixed(0)}%</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              ↗ 24%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Profile ID</th>
                  <th className="text-left p-4 font-medium">Email</th>
                  <th className="text-left p-4 font-medium">Organization</th>
                  <th className="text-left p-4 font-medium">Mobile</th>
                  <th className="text-left p-4 font-medium">Location</th>
                  <th className="text-left p-4 font-medium">Profile Completion</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const completionPercentage = customer.email ? 
                    (customer.address ? 78 : 45) : 0;
                  return (
                    <tr key={customer.id} className="border-b hover:bg-muted/30">
                      <td className="p-4">
                        <span className="font-medium">{index + 1}</span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{customer.email || customer.name}</div>
                        {!customer.email && (
                          <Badge variant="outline" className="text-xs mt-1">
                            No ORG added
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {customer.email ? (
                          <span className="text-muted-foreground">Nil</span>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            No ORG added
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        {customer.phone ? (
                          <div className="flex items-center gap-2">
                            <span>{customer.phone}</span>
                            {customer.phone.startsWith("70") && (
                              <Badge variant="outline" className="text-xs text-red-600">
                                Not Verified
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {customer.address || "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                completionPercentage > 70 ? 'bg-blue-500' : 
                                completionPercentage > 40 ? 'bg-orange-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{completionPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No customers found matching your search.
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

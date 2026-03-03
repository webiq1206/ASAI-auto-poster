import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Car, Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  dealerId: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  stockNumber: string | null;
  mileage: number | null;
  price: string | null;
  condition: string | null;
  status: string;
  bodyType: string | null;
  exteriorColor: string | null;
  transmission: string | null;
  fuelType: string | null;
  photosOriginal: string[] | null;
  photosProcessed: string[] | null;
  photoProcessingStatus: string;
  source: string | null;
  createdAt: string;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sold: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deleted: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PHOTO_STATUS_CLASSES: Record<string, string> = {
  pending: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  complete: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatPrice(price: string | null): string {
  if (!price) return "—";
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMileage(mileage: number | null): string {
  if (mileage == null) return "—";
  return new Intl.NumberFormat("en-US").format(mileage) + " mi";
}

function getVehicleTitle(v: Vehicle): string {
  const parts = [v.year, v.make, v.model].filter(Boolean);
  if (v.trim) parts.push(v.trim);
  return parts.join(" ");
}

export default function Inventory() {
  const [, setLocation] = useLocation();
  const { isOwnerOrAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [addCondition, setAddCondition] = useState("used");

  const { data: vehicles = [], isLoading, error } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setAddOpen(false);
    },
  });

  const filtered = useMemo(() => {
    let list = vehicles;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (v) =>
          String(v.year).includes(q) ||
          (v.make ?? "").toLowerCase().includes(q) ||
          (v.model ?? "").toLowerCase().includes(q) ||
          (v.vin ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((v) => v.status === statusFilter);
    }
    return list;
  }, [vehicles, search, statusFilter]);

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) => (form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement)?.value;
    const featuresVal = get("features")?.trim();
    const features = featuresVal
      ? featuresVal.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean)
      : undefined;
    const mileageVal = get("mileage");
    const mileage = mileageVal ? parseInt(mileageVal, 10) : undefined;
    addMutation.mutate({
      year: parseInt(get("year") ?? "0", 10),
      make: get("make") ?? "",
      model: get("model") ?? "",
      trim: get("trim") || undefined,
      vin: get("vin") || undefined,
      mileage: (mileage !== undefined && !isNaN(mileage)) ? mileage : undefined,
      price: get("price") || undefined,
      condition: addCondition,
      body_type: (form.querySelector('[name="body_type"]') as HTMLInputElement)?.value || undefined,
      transmission: (form.querySelector('[name="transmission"]') as HTMLInputElement)?.value || undefined,
      fuel_type: (form.querySelector('[name="fuel_type"]') as HTMLInputElement)?.value || undefined,
      features,
      description_raw: get("description") || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Failed to load inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="page-inventory">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground dark:text-zinc-100">Inventory</h1>
          <p className="text-sm text-muted-foreground dark:text-zinc-400">
            {filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isOwnerOrAdmin && (
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg dark:border-zinc-800 dark:bg-zinc-900">
              <DialogHeader>
                <DialogTitle>Add Vehicle</DialogTitle>
                <DialogDescription>
                  Enter the vehicle details below. Year, make, and model are required.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      min={1900}
                      max={2100}
                      required
                      placeholder="2024"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      name="make"
                      required
                      placeholder="Toyota"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      name="model"
                      required
                      placeholder="Camry"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trim">Trim</Label>
                    <Input
                      id="trim"
                      name="trim"
                      placeholder="LE"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vin">VIN</Label>
                  <Input
                    id="vin"
                    name="vin"
                    placeholder="1HGBH41JXMN109186"
                    className="dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input
                      id="mileage"
                      name="mileage"
                      type="number"
                      min={0}
                      placeholder="45000"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input
                      id="price"
                      name="price"
                      placeholder="25000"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={addCondition} onValueChange={setAddCondition}>
                    <SelectTrigger className="dark:bg-zinc-800 dark:border-zinc-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-zinc-800 dark:border-zinc-700">
                      <SelectItem value="used">Used</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="certified">Certified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="body_type">Body Type</Label>
                    <Input
                      id="body_type"
                      name="body_type"
                      placeholder="Sedan"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission</Label>
                    <Input
                      id="transmission"
                      name="transmission"
                      placeholder="Automatic"
                      className="dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuel_type">Fuel Type</Label>
                  <Input
                    id="fuel_type"
                    name="fuel_type"
                    placeholder="Gasoline"
                    className="dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="features">Features (comma or newline separated)</Label>
                  <Textarea
                    id="features"
                    name="features"
                    rows={2}
                    placeholder="Leather seats, Sunroof, Backup camera"
                    className="dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={3}
                    placeholder="Vehicle description..."
                    className="dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add Vehicle"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-zinc-500" />
          <Input
            placeholder="Search by year, make, model, or VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 dark:bg-zinc-900 dark:border-zinc-800"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] dark:bg-zinc-900 dark:border-zinc-800">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-zinc-900 dark:border-zinc-800">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="mb-4 h-12 w-12 text-muted-foreground dark:text-zinc-500" />
            <p className="text-muted-foreground dark:text-zinc-400">No vehicles found</p>
            <p className="mt-1 text-sm text-muted-foreground dark:text-zinc-500">
              {vehicles.length === 0
                ? "Add your first vehicle to get started."
                : "Try adjusting your search or filters."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => {
            const thumb =
              (v.photosProcessed && v.photosProcessed[0]) ||
              (v.photosOriginal && v.photosOriginal[0]) ||
              null;
            const statusClass = STATUS_BADGE_CLASSES[v.status] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
            const photoClass =
              PHOTO_STATUS_CLASSES[v.photoProcessingStatus] ??
              "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

            return (
              <Card
                key={v.id}
                className="cursor-pointer transition-colors hover:border-primary/50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                onClick={() => setLocation(`/inventory/${v.id}`)}
              >
                <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-muted dark:bg-zinc-800">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={getVehicleTitle(v)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Car className="h-12 w-12 text-muted-foreground dark:text-zinc-600" />
                    </div>
                  )}
                </div>
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="line-clamp-2 text-base font-medium dark:text-zinc-100">
                    {getVehicleTitle(v)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground dark:text-zinc-200">
                      {formatPrice(v.price)}
                    </span>
                    <span className="text-sm text-muted-foreground dark:text-zinc-500">
                      {formatMileage(v.mileage)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusClass}`}
                    >
                      {v.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${photoClass}`}
                    >
                      {v.photoProcessingStatus}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

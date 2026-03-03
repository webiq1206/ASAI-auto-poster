import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Car,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";

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
  features: string[] | null;
  descriptionRaw: string | null;
  descriptionGenerated: string | null;
  photosOriginal: string[] | null;
  photosProcessed: string[] | null;
  photoProcessingStatus: string;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sold: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  deleted: "bg-red-500/20 text-red-400 border-red-500/30",
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

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isOwnerOrAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: vehicle, isLoading, error } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", id],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/vehicles/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setEditOpen(false);
      toast({ title: "Vehicle updated" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  const soldMutation = useMutation({
    mutationFn: async () => {
      const newStatus = vehicle?.status === "sold" ? "active" : "sold";
      const res = await apiRequest("PUT", `/api/vehicles/${id}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({ title: vehicle?.status === "sold" ? "Marked as active" : "Marked as sold" });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: err.message?.replace(/^\d+:\s*/, ""),
      });
    },
  });

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const get = (name: string) =>
      (form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement)?.value;

    const mileageVal = get("mileage");
    const mileage = mileageVal ? parseInt(mileageVal, 10) : undefined;

    updateMutation.mutate({
      year: parseInt(get("year") ?? "0", 10),
      make: get("make") ?? "",
      model: get("model") ?? "",
      trim: get("trim") || null,
      vin: get("vin") || null,
      mileage: mileage !== undefined && !isNaN(mileage) ? mileage : null,
      price: get("price") || null,
      condition: get("condition") || null,
      body_type: get("body_type") || null,
      exterior_color: get("exterior_color") || null,
      transmission: get("transmission") || null,
      fuel_type: get("fuel_type") || null,
      description_raw: get("description") || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
        <p className="text-destructive">
          {error instanceof Error ? error.message : "Vehicle not found."}
        </p>
      </div>
    );
  }

  const title = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
  const photos = vehicle.photosProcessed?.length
    ? vehicle.photosProcessed
    : vehicle.photosOriginal ?? [];
  const statusClass =
    STATUS_BADGE[vehicle.status] ?? "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/inventory")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className={statusClass}>
              {vehicle.status}
            </Badge>
            {vehicle.stockNumber && (
              <span className="text-sm text-muted-foreground">
                Stock #{vehicle.stockNumber}
              </span>
            )}
          </div>
        </div>
        {isOwnerOrAdmin && (
          <div className="flex gap-2">
            <Button
              variant={vehicle.status === "sold" ? "default" : "outline"}
              onClick={() => soldMutation.mutate()}
              disabled={soldMutation.isPending}
            >
              {soldMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : vehicle.status === "sold" ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Mark Active
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Mark Sold
                </>
              )}
            </Button>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Edit Vehicle</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Year</Label>
                      <Input name="year" type="number" defaultValue={vehicle.year} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Make</Label>
                      <Input name="make" defaultValue={vehicle.make} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Model</Label>
                      <Input name="model" defaultValue={vehicle.model} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Trim</Label>
                      <Input name="trim" defaultValue={vehicle.trim ?? ""} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>VIN</Label>
                    <Input name="vin" defaultValue={vehicle.vin ?? ""} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Mileage</Label>
                      <Input
                        name="mileage"
                        type="number"
                        defaultValue={vehicle.mileage ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input name="price" defaultValue={vehicle.price ?? ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Input name="condition" defaultValue={vehicle.condition ?? ""} />
                    </div>
                    <div className="space-y-2">
                      <Label>Body Type</Label>
                      <Input name="body_type" defaultValue={vehicle.bodyType ?? ""} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exterior Color</Label>
                      <Input
                        name="exterior_color"
                        defaultValue={vehicle.exteriorColor ?? ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Transmission</Label>
                      <Input
                        name="transmission"
                        defaultValue={vehicle.transmission ?? ""}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuel Type</Label>
                    <Input name="fuel_type" defaultValue={vehicle.fuelType ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      name="description"
                      rows={3}
                      defaultValue={vehicle.descriptionRaw ?? ""}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {photos.length > 0 ? (
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <div
              key={i}
              className="aspect-video overflow-hidden rounded-lg border border-border bg-muted"
            >
              <img src={url} alt={`${title} photo ${i + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No photos available</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                ["Year", vehicle.year],
                ["Make", vehicle.make],
                ["Model", vehicle.model],
                ["Trim", vehicle.trim],
                ["VIN", vehicle.vin],
                ["Stock #", vehicle.stockNumber],
                ["Condition", vehicle.condition],
                ["Body Type", vehicle.bodyType],
                ["Exterior Color", vehicle.exteriorColor],
                ["Transmission", vehicle.transmission],
                ["Fuel Type", vehicle.fuelType],
                ["Source", vehicle.source],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-sm font-medium text-foreground">
                    {value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Pricing & Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(vehicle.price)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Mileage</span>
              <span className="text-sm font-medium text-foreground">
                {formatMileage(vehicle.mileage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Photo Status</span>
              <Badge variant="outline" className="text-xs">
                {vehicle.photoProcessingStatus}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Added</span>
              <span className="text-sm text-foreground">
                {new Date(vehicle.createdAt).toLocaleDateString()}
              </span>
            </div>

            {vehicle.descriptionRaw && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {vehicle.descriptionRaw}
                </p>
              </div>
            )}

            {vehicle.descriptionGenerated && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-1">
                  AI-Generated Description
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {vehicle.descriptionGenerated}
                </p>
              </div>
            )}

            {vehicle.features && vehicle.features.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-2">Features</p>
                <div className="flex flex-wrap gap-1">
                  {vehicle.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

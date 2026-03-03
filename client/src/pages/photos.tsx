import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Image, Loader2, Car, Sparkles, ArrowRight } from "lucide-react";

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  photosOriginal: string[] | null;
  photosProcessed: string[] | null;
  photoProcessingStatus: string;
}

const PHOTO_STATUS: Record<string, { className: string; label: string }> = {
  pending: { className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", label: "Pending" },
  processing: { className: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Processing" },
  complete: { className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Complete" },
  failed: { className: "bg-red-500/20 text-red-400 border-red-500/30", label: "Failed" },
};

function getTitle(v: Vehicle): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ");
}

export default function Photos() {
  const { user } = useAuth();
  const features = user?.features;
  const hasBackgrounds = features?.customBackgrounds;
  const hasVisualMerch = features?.visualMerchandising;
  const hasPhotoFeatures = hasBackgrounds || hasVisualMerch;

  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const withPhotos = vehicles.filter(
    (v) =>
      (v.photosOriginal && v.photosOriginal.length > 0) ||
      (v.photosProcessed && v.photosProcessed.length > 0)
  );

  const statusCounts = vehicles.reduce(
    (acc, v) => {
      acc[v.photoProcessingStatus] = (acc[v.photoProcessingStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Photo Processing</h1>
        <p className="text-sm text-muted-foreground">
          Manage and enhance vehicle photos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(PHOTO_STATUS).map(([key, cfg]) => (
          <Card key={key} className="border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground capitalize">
                  {cfg.label}
                </p>
                <Badge variant="outline" className={cfg.className}>
                  {statusCounts[key] ?? 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasPhotoFeatures && (
        <Card className="border-border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-[1px]">
            <div className="bg-background rounded-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Upgrade for AI Photo Processing
                </CardTitle>
                <CardDescription>
                  Custom Backgrounds and Visual Merchandising features let you automatically
                  enhance your vehicle photos with professional backgrounds and branding.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button variant="outline" asChild>
                  <a href="/billing">
                    View Plans
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </Button>
              </CardContent>
            </div>
          </div>
        </Card>
      )}

      {hasPhotoFeatures && (
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Before / After Comparisons</CardTitle>
            <CardDescription>
              {hasVisualMerch
                ? "Visual Merchandising: AI-enhanced backgrounds and branding"
                : "Custom Backgrounds: Professionally replaced photo backgrounds"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {withPhotos.filter((v) => v.photosProcessed?.length && v.photosOriginal?.length)
              .length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Image className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No processed photos yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Photos will be processed automatically when vehicles are added
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {withPhotos
                  .filter((v) => v.photosProcessed?.length && v.photosOriginal?.length)
                  .slice(0, 6)
                  .map((v) => (
                    <div key={v.id} className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {getTitle(v)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Original</p>
                          <div className="aspect-video rounded-lg border border-border overflow-hidden bg-muted">
                            <img
                              src={v.photosOriginal![0]}
                              alt="Original"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Enhanced</p>
                          <div className="aspect-video rounded-lg border border-border overflow-hidden bg-muted">
                            <img
                              src={v.photosProcessed![0]}
                              alt="Enhanced"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Vehicle Photo Status</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Car className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No vehicles in inventory</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => {
                const cfg =
                  PHOTO_STATUS[v.photoProcessingStatus] ?? PHOTO_STATUS.pending;
                const thumb =
                  v.photosProcessed?.[0] || v.photosOriginal?.[0] || null;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-muted overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={getTitle(v)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getTitle(v)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {v.photosOriginal?.length ?? 0} photo
                        {(v.photosOriginal?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

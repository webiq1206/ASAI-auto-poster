import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Settings2, Save, Loader2 } from "lucide-react";

const DAYS = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

interface ScheduleData {
  id?: string;
  postsPerDay: number;
  postingWindowStart: string;
  postingWindowEnd: string;
  daysOfWeek: number[];
  isActive: boolean;
  skipRecentlyPostedDays: number;
  enableGroupCrosspost: boolean;
}

export default function PostingSchedule() {
  const { isOwnerOrAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: schedule, isLoading } = useQuery<ScheduleData>({
    queryKey: ["/api/schedules"],
    queryFn: async () => {
      const res = await fetch("/api/schedules", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch schedule");
      const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    },
  });

  const [postsPerDay, setPostsPerDay] = useState("8");
  const [windowStart, setWindowStart] = useState("08:00");
  const [windowEnd, setWindowEnd] = useState("21:00");
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [skipDays, setSkipDays] = useState("3");
  const [groupCrosspost, setGroupCrosspost] = useState(true);

  useEffect(() => {
    if (schedule) {
      setPostsPerDay(String(schedule.postsPerDay ?? 8));
      setWindowStart(schedule.postingWindowStart ?? "08:00");
      setWindowEnd(schedule.postingWindowEnd ?? "21:00");
      setActiveDays(schedule.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6]);
      setSkipDays(String(schedule.skipRecentlyPostedDays ?? 3));
      setGroupCrosspost(schedule.enableGroupCrosspost ?? true);
    }
  }, [schedule]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/schedules", {
        posts_per_day: Number(postsPerDay),
        posting_window_start: windowStart,
        posting_window_end: windowEnd,
        days_of_week: activeDays,
        skip_recently_posted_days: Number(skipDays),
        enable_group_crosspost: groupCrosspost,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule saved" });
    },
    onError: () => {
      toast({ title: "Failed to save schedule", variant: "destructive" });
    },
  });

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Posting Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Configure when and how often vehicles are posted
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5" />
              Posting Window
            </CardTitle>
            <CardDescription>
              Time range when the system will post vehicles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={windowStart}
                  onChange={(e) => setWindowStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={windowEnd}
                  onChange={(e) => setWindowEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Active Days</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <Badge
                    key={day.value}
                    variant={activeDays.includes(day.value) ? "default" : "outline"}
                    className="cursor-pointer transition-colors"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Settings2 className="h-5 w-5" />
              Posting Limits
            </CardTitle>
            <CardDescription>
              Control posting volume and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Max Posts Per Day</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={postsPerDay}
                onChange={(e) => setPostsPerDay(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 8-12 during warm-up, up to 20 for established accounts
              </p>
            </div>

            <div className="space-y-2">
              <Label>Skip Recently Posted (days)</Label>
              <Input
                type="number"
                min={0}
                max={30}
                value={skipDays}
                onChange={(e) => setSkipDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Vehicles posted within this many days will be skipped
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Group Cross-posting</p>
                <p className="text-xs text-muted-foreground">
                  Also post to linked Facebook Buy/Sell groups
                </p>
              </div>
              <Button
                variant={groupCrosspost ? "default" : "outline"}
                size="sm"
                className="h-7 w-14 text-xs"
                onClick={() => setGroupCrosspost(!groupCrosspost)}
              >
                {groupCrosspost ? "ON" : "OFF"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Schedule
        </Button>
      </div>
    </div>
  );
}

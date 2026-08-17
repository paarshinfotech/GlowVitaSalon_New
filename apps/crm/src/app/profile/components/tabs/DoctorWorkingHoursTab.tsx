import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@repo/ui/card";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Switch } from "@repo/ui/switch";
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGetCrmDoctorWorkingHoursQuery, useUpdateCrmDoctorWorkingHoursMutation } from '@repo/store/api';
import { useCrmAuth } from '@/hooks/useCrmAuth';

type TimeSlot = {
  start: string;
  end: string;
};

type DaySchedule = {
  day: string;
  isOpen: boolean;
  slots: TimeSlot[];
};

const initialSchedule: DaySchedule[] = [
  { day: 'Monday', isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Tuesday', isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Wednesday', isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Thursday', isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Friday', isOpen: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day: 'Saturday', isOpen: false, slots: [] },
  { day: 'Sunday', isOpen: false, slots: [] },
];

export const DoctorWorkingHoursTab = () => {
  const { role } = useCrmAuth();
  const [schedule, setSchedule] = useState<DaySchedule[]>(initialSchedule);
  const [slotGap, setSlotGap] = useState<number>(20);
  const [isSavingSlotGap, setIsSavingSlotGap] = useState(false);

  // Fetch working hours
  const { data: workingHoursData, isLoading, error, refetch } = useGetCrmDoctorWorkingHoursQuery(undefined, {
    skip: role !== 'doctor'
  });

  // Update working hours mutation
  const [updateWorkingHours, { isLoading: isSaving }] = useUpdateCrmDoctorWorkingHoursMutation();

  // Transform API data to schedule format
  useEffect(() => {
    if (workingHoursData?.workingHoursArray) {
      const transformedSchedule: DaySchedule[] = workingHoursData.workingHoursArray.map((dayData: any) => {
        let parsedSlots: TimeSlot[] = [];
        
        if (dayData.isOpen) {
          if (dayData.hours && dayData.hours.length > 0) {
            parsedSlots = dayData.hours.map((h: any) => ({
              start: h.openTime || h.open,
              end: h.closeTime || h.close
            }));
          } else if (dayData.open && dayData.close) {
            parsedSlots = [{ start: dayData.open, end: dayData.close }];
          }
        }

        return {
          day: dayData.day,
          isOpen: dayData.isOpen,
          slots: parsedSlots
        };
      });
      setSchedule(transformedSchedule);

      // Set slot gap from API data
      if (workingHoursData.slotGap !== undefined) {
        setSlotGap(workingHoursData.slotGap);
      }
    }
  }, [workingHoursData]);

  const handleToggleDay = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].isOpen = !newSchedule[dayIndex].isOpen;
    if (!newSchedule[dayIndex].isOpen) {
      newSchedule[dayIndex].slots = [];
    } else if (newSchedule[dayIndex].slots.length === 0) {
      newSchedule[dayIndex].slots = [{ start: '09:00', end: '17:00' }];
    }
    setSchedule(newSchedule);
  };

  const handleSlotChange = (dayIndex: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots[slotIndex][field] = value;
    setSchedule(newSchedule);
  };

  const addSlot = (dayIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.push({ start: '09:00', end: '17:00' });
    setSchedule(newSchedule);
  };

  const removeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex].slots.splice(slotIndex, 1);
    setSchedule(newSchedule);
  };

  const handleSaveSlotGap = async () => {
    try {
      // Validate slot gap
      if (slotGap < 0 || slotGap > 60) {
        toast.error('Invalid Value', {
          description: 'Slot gap must be between 0 and 60 minutes.'
        });
        return;
      }

      setIsSavingSlotGap(true);

      const requestBody = { slotGap: slotGap };

      const response = await fetch('/api/crm/doctor-workinghours', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });


      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to save slot gap');
      }

      toast.success('Slot gap saved successfully!');
      refetch();
    } catch (error: any) {
      console.error('Error saving slot gap:', error);
      toast.error(error.message || 'Failed to save slot gap.');
    } finally {
      setIsSavingSlotGap(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Transform schedule to API format
      const workingHours: Record<string, any> = {};
      const dayMapping: Record<string, string> = {
        'Monday': 'monday',
        'Tuesday': 'tuesday',
        'Wednesday': 'wednesday',
        'Thursday': 'thursday',
        'Friday': 'friday',
        'Saturday': 'saturday',
        'Sunday': 'sunday'
      };

      schedule.forEach(daySchedule => {
        const dayKey = dayMapping[daySchedule.day];
        workingHours[dayKey] = {
          isOpen: daySchedule.isOpen,
          hours: daySchedule.isOpen && daySchedule.slots.length > 0
            ? daySchedule.slots.map(slot => ({
              openTime: slot.start,
              closeTime: slot.end
            }))
            : []
        };
      });

      await updateWorkingHours({ workingHours }).unwrap();
      toast.success("Working hours saved successfully!");
      refetch();
    } catch (error: any) {
      console.error("Error saving working hours:", error);
      toast.error(error?.data?.message || "Failed to save working hours");
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Set your weekly availability. This will affect when patients can book consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Set your weekly availability. This will affect when patients can book consultations.
          </CardDescription>
        </CardHeader>
        <CardContent className="py-12">
          <p className="text-center text-destructive">Failed to load working hours. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>
          Set your weekly availability. This will affect when patients can book consultations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Slot Gap Configuration */}
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Label htmlFor="slotGap" className="text-base font-medium mb-2 block">
                Gap Between Slots (minutes)
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                Set the buffer time between consecutive appointment slots
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Input
                    id="slotGap"
                    type="number"
                    min="0"
                    max="60"
                    value={slotGap}
                    onChange={(e) => setSlotGap(parseInt(e.target.value) || 0)}
                    className="text-lg"
                    placeholder="20"
                  />
                </div>
                <span className="text-muted-foreground">minutes</span>
                <Button
                  onClick={handleSaveSlotGap}
                  disabled={isSavingSlotGap}
                  variant="secondary"
                  size="sm"
                >
                  {isSavingSlotGap ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Gap'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Each consultation is 20 minutes. Total interval: {20 + slotGap} minutes
              </p>
            </div>
          </div>
        </div>

        {/* Weekly Schedule */}
        {schedule.map((daySchedule, dayIndex) => (
          <div key={daySchedule.day} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id={`switch-${daySchedule.day}`}
                  checked={daySchedule.isOpen}
                  onCheckedChange={() => handleToggleDay(dayIndex)}
                />
                <Label htmlFor={`switch-${daySchedule.day}`} className="text-lg font-medium">
                  {daySchedule.day}
                </Label>
              </div>
              <span className={`text-sm font-semibold ${daySchedule.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                {daySchedule.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            {daySchedule.isOpen && (
              <div className="mt-4 pl-8 space-y-4">
                {daySchedule.slots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="flex items-center gap-4">
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" value={slot.start} onChange={(e) => handleSlotChange(dayIndex, slotIndex, 'start', e.target.value)} className="pl-10" />
                      </div>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="time" value={slot.end} onChange={(e) => handleSlotChange(dayIndex, slotIndex, 'end', e.target.value)} className="pl-10" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeSlot(dayIndex, slotIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => addSlot(dayIndex)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Time Slot
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

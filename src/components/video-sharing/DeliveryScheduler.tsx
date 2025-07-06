import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Send, Save, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type DeliveryOption = 'send-now' | 'schedule' | 'save-only';

interface DeliverySchedulerProps {
  deliveryOption: DeliveryOption;
  scheduledDate?: Date;
  onDeliveryOptionChange: (option: DeliveryOption) => void;
  onScheduledDateChange: (date: Date | undefined) => void;
  selectedContactsCount: number;
  isPublic: boolean;
}

export function DeliveryScheduler({
  deliveryOption,
  scheduledDate,
  onDeliveryOptionChange,
  onScheduledDateChange,
  selectedContactsCount,
  isPublic
}: DeliverySchedulerProps) {
  const getDeliveryDescription = () => {
    switch (deliveryOption) {
      case 'send-now':
        if (isPublic) {
          return "Video will be published to the public feed immediately";
        }
        if (selectedContactsCount === 0) {
          return "Video will be saved to your private library";
        }
        return `Video will be sent to ${selectedContactsCount} contact${selectedContactsCount === 1 ? '' : 's'} immediately`;
      
      case 'schedule':
        if (isPublic) {
          return scheduledDate ? 
            `Video will be published to the public feed on ${format(scheduledDate, "PPP")}` :
            "Choose when to publish to the public feed";
        }
        if (selectedContactsCount === 0) {
          return scheduledDate ?
            `Video will remain private until ${format(scheduledDate, "PPP")}` :
            "Choose when to make the video available";
        }
        return scheduledDate ?
          `Video will be sent to ${selectedContactsCount} contact${selectedContactsCount === 1 ? '' : 's'} on ${format(scheduledDate, "PPP")}` :
          "Choose when to send the video";
      
      case 'save-only':
        return "Video will be saved to your library without sending or publishing";
      
      default:
        return "";
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-primary" />
          <span>Delivery Options</span>
        </CardTitle>
        <CardDescription>
          Choose when and how to share your video message
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup 
          value={deliveryOption} 
          onValueChange={(value) => onDeliveryOptionChange(value as DeliveryOption)}
          className="space-y-3"
        >
          {/* Send Now */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="send-now" id="send-now" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="send-now" className="font-medium flex items-center space-x-2 cursor-pointer">
                <Send className="w-4 h-4 text-primary" />
                <span>{isPublic ? "Publish Now" : "Send Now"}</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isPublic ? 
                  "Make video immediately available in the public feed" :
                  selectedContactsCount > 0 ? 
                    "Send video to selected contacts immediately" :
                    "Save to your private library (no sharing)"
                }
              </p>
            </div>
          </div>

          {/* Schedule */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="schedule" id="schedule" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="schedule" className="font-medium flex items-center space-x-2 cursor-pointer">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>Schedule</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {isPublic ?
                  "Choose a future date to publish to the public feed" :
                  selectedContactsCount > 0 ?
                    "Choose when to send to selected contacts" :
                    "Schedule when the video becomes available"
                }
              </p>
              
              {deliveryOption === 'schedule' && (
                <div className="mt-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={onScheduledDateChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </div>

          {/* Save Only */}
          <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <RadioGroupItem value="save-only" id="save-only" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="save-only" className="font-medium flex items-center space-x-2 cursor-pointer">
                <Save className="w-4 h-4 text-primary" />
                <span>Save Only</span>
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Save to your library without sending or publishing. You can share it later.
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Summary */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium text-foreground mb-1">Summary:</p>
          <p className="text-sm text-muted-foreground">
            {getDeliveryDescription()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
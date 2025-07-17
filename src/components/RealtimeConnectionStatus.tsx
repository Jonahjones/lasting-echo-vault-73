import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2, AlertTriangle } from "lucide-react";
import { useRealtime } from "@/contexts/RealtimeContext";

export function RealtimeConnectionStatus() {
  const { connectionState, isConnected } = useRealtime();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return {
          icon: <Wifi className="w-3 h-3" />,
          text: 'Live',
          variant: 'default' as const,
          className: 'bg-success text-success-foreground'
        };
      case 'CONNECTING':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 text-white'
        };
      case 'DISCONNECTED':
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: 'Offline',
          variant: 'outline' as const,
          className: 'bg-gray-500 text-white'
        };
      case 'ERROR':
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          text: 'Error',
          variant: 'destructive' as const,
          className: 'bg-red-500 text-white'
        };
      default:
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-500 text-white'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={`${config.className} flex items-center gap-1 text-xs`}>
      {config.icon}
      <span>{config.text}</span>
    </Badge>
  );
}
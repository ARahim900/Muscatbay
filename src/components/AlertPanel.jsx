
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, CheckCircle, X } from "lucide-react";
import { format } from "date-fns";

const severityColors = {
  low: { 
    bg: "bg-[var(--mint)]/20", 
    text: "text-[var(--primary)]", 
    border: "border-[var(--mint)]/30" 
  },
  medium: { 
    bg: "bg-[var(--color-warning)]/10", 
    text: "text-[var(--color-warning)]", 
    border: "border-[var(--color-warning)]/20" 
  },
  high: { 
    bg: "bg-[var(--color-alert)]/10", 
    text: "text-[var(--color-alert)]", 
    border: "border-[var(--color-alert)]/20" 
  },
  critical: { 
    bg: "bg-[var(--color-alert)]/20", 
    text: "text-[var(--color-alert)]", 
    border: "border-[var(--color-alert)]/30" 
  }
};

export default function AlertPanel({ alerts, onDismissAlert }) {
  const activeAlerts = alerts.filter(alert => alert.status === 'active');

  return (
    <Card className="card-elevation">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
          Active Alerts
          <Badge className="bg-[var(--color-alert)] text-white">{activeAlerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-success)]" />
            <p className="text-sm">All systems are running normally</p>
          </div>
        ) : (
          activeAlerts.slice(0, 5).map((alert) => {
            const severityConfig = severityColors[alert.severity] || severityColors.medium;
            
            return (
              <div 
                key={alert.id} 
                className={`p-4 rounded-lg border ${severityConfig.bg} ${severityConfig.border} transition-all duration-200`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`${severityConfig.bg} ${severityConfig.text} ${severityConfig.border} border text-xs`}
                      >
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {format(new Date(alert.created_date), "MMM d, HH:mm")}
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 ml-2"
                    onClick={() => onDismissAlert(alert.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        
        {activeAlerts.length > 5 && (
          <Button variant="outline" className="w-full mt-3">
            View All {activeAlerts.length} Alerts
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

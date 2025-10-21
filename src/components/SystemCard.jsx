
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/lib/utils";

const statusConfigMap = {
  operational: { 
    bg: "bg-[var(--color-success)]/10", 
    text: "text-[var(--color-success)]", 
    border: "border-[var(--color-success)]/20", 
    icon: CheckCircle 
  },
  maintenance: { 
    bg: "bg-[var(--color-warning)]/10", 
    text: "text-[var(--color-warning)]", 
    border: "border-[var(--color-warning)]/20", 
    icon: AlertTriangle 
  },
  offline: { 
    bg: "bg-[var(--color-alert)]/10", 
    text: "text-[var(--color-alert)]", 
    border: "border-[var(--color-alert)]/20", 
    icon: AlertTriangle 
  },
  alert: { 
    bg: "bg-[var(--color-alert)]/20", 
    text: "text-[var(--color-alert)]", 
    border: "border-[var(--color-alert)]/30", 
    icon: AlertTriangle 
  }
};

export default function SystemCard({ 
  title, 
  icon: Icon, 
  status, 
  value, 
  unit, 
  trend, 
  trendValue, 
  color,
  pageUrl,
  alerts = 0
}) {
  const statusConfig = statusConfigMap[status] || statusConfigMap.operational;
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="card-elevation hover:scale-105 transition-all duration-300 bg-white border-0">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[${color}]/10`}>
              <Icon className={`w-6 h-6 text-[${color}]`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <Badge 
                variant="outline" 
                className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border mt-1`}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          </div>
          {alerts > 0 && (
            <Badge className="bg-[var(--color-alert)] text-white">
              {alerts} Alert{alerts > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-[var(--color-alert)]" />
                )}
                <span className={`text-sm ${trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-alert)]'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>

          <Link to={pageUrl}>
            <Button 
              variant="ghost" 
              className="w-full justify-start ripple-effect hover:bg-gray-50"
            >
              View Details →
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

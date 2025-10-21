
// ZoneAnalysis v1.1 - Fixed KPI calculations: Zone Bulk (L2 only), Individual (L3 only), Loss (L2-L3)
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis,
  Label
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MoreVertical, ChevronDown, Filter, ChevronRight, Building, Users, Droplets, Zap } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Helper to format 'YYYY-MM' -> 'Mon-yy' (e.g., 2025-01 -> Jan-25)
function formatYyyyMmToMonYY(yyyyMm) {
  if (!yyyyMm || typeof yyyyMm !== "string") return "";
  const [y, m] = yyyyMm.split("-");
  const idx = parseInt(m, 10);
  const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mon = names[idx] || "";
  return mon ? `${mon}-${y.slice(-2)}` : "";
}

// Pretty zone label
function prettyZone(z = "") {
  return z.replace(/_/g, " ");
}

// Replace/augment constants with case-insensitive banned zones
const BANNED_ZONE_NAMES = ["Main Source", "Zone A", "Zone B", "Main Bulk", "Main BULK"];
const BANNED_ZONES_LOWER = new Set(BANNED_ZONE_NAMES.map((z) => z.toLowerCase()));
const DC_ALIASES = ["direct connection", "dc", "direct connections"];
const NA_ALIASES = ["n/a", "na"];

// Zones where L4 must be excluded to avoid duplication
const EXCLUDE_L4_ZONES = new Set(["Zone_03_(A)", "Zone_03_(B)"]);

// Define the complete zone hierarchy structure as provided
const ZONE_HIERARCHY = {
  "L1": {
    label: "Main Bulk (NAMA)",
    children: {
      "Direct Connections": {
        label: "Direct Connections",
        children: {
          "Hotel Main Building": { type: "Direct Connection" },
          "Al Adrak Camp": { type: "Direct Connection" },
          "Al Adrak Company (accommodation)": { type: "Direct Connection" },
          "Irrigation Controller UP": { type: "Direct Connection" },
          "Irrigation Controller DOWN": { type: "Direct Connection" },
          "Community Mgmt - Technical Zone, STP": { type: "Direct Connection" },
          "Building (Security)": { type: "Direct Connection" },
          "Building (ROP)": { type: "Direct Connection" },
          "PHASE 02, MAIN ENTRANCE": { type: "Direct Connection" },
          "Irrigation Tank 01 (Inlet)": { type: "Direct Connection" },
          "Irrigation Tank 04 (Z08)": { type: "Direct Connection" }
        }
      },
      "Zone_01_(FM)": {
        label: "Zone 01 (FM)",
        level: "L2",
        children: {
          "Building FM": { type: "L3", level: "L3" },
          "Building Taxi": { type: "L3", level: "L3" },
          "Building B1": { type: "L3", level: "L3" },
          "Building B2": { type: "L3", level: "L3" },
          "Building B3": { type: "L3", level: "L3" },
          "Building B4": { type: "L3", level: "L3" },
          "Building B5": { type: "L3", level: "L3" },
          "Building B6": { type: "L3", level: "L3" },
          "Building B7": { type: "L3", level: "L3" },
          "Building B8": { type: "L3", level: "L3" },
          "Building CIF/CB": { type: "L3", level: "L3" },
          "Building Nursery": { type: "L3", level: "L3" },
          "Cabinet FM (CONTRACTORS OFFICE)": { type: "L3", level: "L3" },
          "Building (MEP)": { type: "L3", level: "L3" },
          "Room PUMP (FIRE)": { type: "L3", level: "L3" },
          "Building CIF/CB (COFFEE SH)": { type: "L3", level: "L3" },
          "Irrigation Tank (Z01_FM)": { type: "L3", level: "L3" }
        }
      },
      "Zone_03_(A)": {
        label: "Zone 03 (A)",
        level: "L2",
        children: {
          "Villas_21_units": {
            label: "Villas (21 units)",
            type: "L3",
            level: "L3",
            children: {
              "Z3-42": { type: "L3", level: "L3" },
              "Z3-38": { type: "L3", level: "L3" },
              "Z3-23": { type: "L3", level: "L3" },
              "Z3-41": { type: "L3", level: "L3" },
              "Z3-37": { type: "L3", level: "L3" },
              "Z3-43": { type: "L3", level: "L3" },
              "Z3-31": { type: "L3", level: "L3" },
              "Z3-35": { type: "L3", level: "L3" },
              "Z3-40": { type: "L3", level: "L3" },
              "Z3-30": { type: "L3", level: "L3" },
              "Z3-33": { type: "L3", level: "L3" },
              "Z3-36": { type: "L3", level: "L3" },
              "Z3-32": { type: "L3", level: "L3" },
              "Z3-39": { type: "L3", level: "L3" },
              "Z3-34": { type: "L3", level: "L3" },
              "Z3-27": { type: "L3", level: "L3" },
              "Z3-24": { type: "L3", level: "L3" },
              "Z3-25": { type: "L3", level: "L3" },
              "Z3-26": { type: "L3", level: "L3" },
              "Z3-29": { type: "L3", level: "L3" },
              "Z3-28": { type: "L3", level: "L3" }
            }
          },
          "Building_Bulk_Meters": {
            label: "Building Bulk Meters (10 units)",
            type: "L3",
            level: "L3"
          }
        }
      },
      "Zone_03_(B)": {
        label: "Zone 03 (B)",
        level: "L2",
        children: {
          "Villas_22_units": {
            label: "Villas (22 units)",
            type: "L3",
            level: "L3"
          },
          "Building_Bulk_Meters_11": {
            label: "Building Bulk Meters (11 units)",
            type: "L3",
            level: "L3"
          },
          "Irrigation Tank 02 (Z03)": { type: "L3", level: "L3" }
        }
      },
      "Zone_05": {
        label: "Zone 05",
        level: "L2",
        children: {
          "Villas_33_units": {
            label: "Villas (33 units)",
            type: "L3",
            level: "L3"
          },
          "Irrigation Tank 03 (Z05)": { type: "L3", level: "L3" }
        }
      },
      "Zone_08": {
        label: "Zone 08",
        level: "L2",
        children: {
          "Villas_22_units_Z8": {
            label: "Villas (22 units)",
            type: "L3",
            level: "L3"
          }
        }
      },
      "Zone_VS": {
        label: "Zone VS (Village Square)",
        level: "L2",
        children: {
          "Irrigation Tank - VS PO Water": { type: "L3", level: "L3" },
          "Coffee 1 (GF Shop No.591)": { type: "L3", level: "L3" },
          "Coffee 2 (GF Shop No.594 A)": { type: "L3", level: "L3" },
          "Supermarket (FF Shop No.591)": { type: "L3", level: "L3" },
          "Pharmacy (FF Shop No.591 A)": { type: "L3", level: "L3" },
          "Laundry Services (FF Shop No.593)": { type: "L3", level: "L3" },
          "Shop No.593 A": { type: "L3", level: "L3" }
        }
      },
      "Zone_SC": {
        label: "Zone SC (Sales Center)",
        level: "L2",
        children: {
          "Sale Centre Caffe & Bar": { type: "L3", level: "L3" }
        }
      }
    }
  }
};

function getMonthsInRange(start, end) {
  if (!start || !end) return [];
  const months = [];
  const startYear = parseInt(start.split("-")[0]);
  const startMonth = parseInt(start.split("-")[1]);
  const endYear = parseInt(end.split("-")[0]);
  const endMonth = parseInt(end.split("-")[1]);

  for (let year = startYear; year <= endYear; year++) {
    const mStart = year === startYear ? startMonth : 1;
    const mEnd = year === endYear ? endMonth : 12;
    for (let m = mStart; m <= mEnd; m++) {
      const names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const yy = year.toString().slice(-2);
      months.push(`${names[m]}-${yy}`);
    }
  }
  return months;
}

const isVilla = (meter) => {
  const t = (meter.meter_type || "").toLowerCase();
  const lbl = (meter.meter_label || "").toLowerCase();
  const zn = (meter.zone || "").toLowerCase();
  const villaKeywords = ["villa", "residential", "aqaar", "apartment", "unit"];
  return villaKeywords.some((k) => t.includes(k) || lbl.includes(k) || zn.includes(k));
};

const isL2 = (m) => (m.level || "").toUpperCase() === "L2";
const isL3 = (m) => (m.level || "").toUpperCase() === "L3";
const isL4 = (m) => (m.level || "").toUpperCase() === "L4";
const isL1 = (m) => (m.level || "").toUpperCase() === "L1";
// Add a helper to classify L3 building bulk
const isBuildingBulk = (m) => isL3(m) && !isVilla(m);

function getZoneStatus(lossPercent, { zoneBulk = 0, hasIndividuals = true } = {}) {
  const loss = parseFloat(lossPercent || "0");
  if (zoneBulk > 0 && !hasIndividuals) {
    return { label: "No meters connected", color: "#6b7280", badge: "bg-gray-100 text-gray-700", icon: "⚪" };
  }
  if (loss < 0) {
    // Anomaly: individual sum > bulk
    return { label: "Anomaly", color: "#7c3aed", badge: "bg-purple-100 text-purple-700", icon: "🟣" };
  }
  if (loss < 10) return { label: "Excellent", color: "#10b981", badge: "bg-green-100 text-green-700", icon: "🟢" };
  if (loss < 20) return { label: "Good", color: "#3b82f6", badge: "bg-blue-100 text-blue-700", icon: "🔵" };
  if (loss < 30) return { label: "Moderate", color: "#fbbf24", badge: "bg-yellow-100 text-yellow-700", icon: "🟡" };
  if (loss < 50) return { label: "High", color: "#f97316", badge: "bg-orange-100 text-orange-700", icon: "🟠" };
  return { label: "Critical", color: "#dc2626", badge: "bg-red-100 text-red-700", icon: "🔴" };
}

// Helpers to parse/sort month keys like 'Jan-25'
function parseMonthKey(key) {
  if (!key || typeof key !== "string" || key.length < 5) return null;
  const parts = key.split("-");
  if (parts.length !== 2) return null;
  const monthAbbr = parts[0];
  const yy = parseInt(parts[1], 10);
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const m = months[monthAbbr];
  if (m === undefined || isNaN(yy)) return null;
  // Assume 20xx years for yy (e.g., 25 -> 2025)
  const year = 2000 + yy;
  return { year, month: m };
}
function compareMonthKey(a, b) {
  const pa = parseMonthKey(a);
  const pb = parseMonthKey(b);
  if (!pa || !pb) return 0;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.month - pb.month;
}

// Enhanced Table Component
function EnhancedMeterTable({ meters, monthsForTable, selectedZone, onBuildingClick }) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortConfig, setSortConfig] = React.useState({ key: 'total', direction: 'desc' });

  // Filter and search logic
  const filteredMeters = React.useMemo(() => {
    return meters.filter(meter => {
      const matchesSearch = meter.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           meter.account.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || meter.status === statusFilter;
      const matchesType = typeFilter === "all" || meter.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [meters, searchTerm, statusFilter, typeFilter]);

  // Sorting logic
  const sortedMeters = React.useMemo(() => {
    const sorted = [...filteredMeters];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [filteredMeters, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedMeters.length / rowsPerPage);
  const paginatedMeters = sortedMeters.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusColor = (status) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
  };

  const getTypeColor = (type) => {
    return type === 'Building Bulk' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
  };

  // Get unique values for filters
  const uniqueStatuses = [...new Set(meters.map(m => m.status))];
  const uniqueTypes = [...new Set(meters.map(m => m.type))];

  return (
    <div className="space-y-4">
      {/* Enhanced Top Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search meters or accounts..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-white">
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status === 'active' ? 'Active' : 'Inactive'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-white">
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Total {sortedMeters.length} of {meters.length} meters</span>
          <div className="flex items-center gap-2">
            <label>Rows per page:</label>
            <Select value={rowsPerPage.toString()} onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-20 dark:bg-gray-700 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Enhanced Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('label')}
                >
                  <div className="flex items-center gap-1">
                    Meter Label
                    {sortConfig.key === 'label' && (
                      <span className="text-blue-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                {monthsForTable.map((month, idx) => (
                  <th key={month} className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {month}
                  </th>
                ))}
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    {sortConfig.key === 'total' && (
                      <span className="text-blue-500">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedMeters.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {row.type === "Building Bulk" ? (
                      <button
                        className="text-[var(--accent)] hover:underline font-medium"
                        onClick={() => onBuildingClick(row)}
                        title="View L4 meters under this building"
                      >
                        {row.label}
                      </button>
                    ) : (
                      <span className="font-medium text-gray-900 dark:text-white">{row.label}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {row.account}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getTypeColor(row.type)} border-transparent`}>
                      {row.type}
                    </Badge>
                  </td>
                  {monthsForTable.map((month, idx) => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                      {Number(row[`m${idx}`] || 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900 dark:text-white">
                    {row.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getStatusColor(row.status)} border-transparent`}>
                      {row.statusLabel}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-gray-800 dark:border-gray-700">
                        <DropdownMenuItem className="dark:text-white dark:hover:bg-gray-700">
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="dark:text-white dark:hover:bg-gray-700">
                          Edit Meter
                        </DropdownMenuItem>
                        <DropdownMenuItem className="dark:text-white dark:hover:bg-gray-700">
                          Export Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, sortedMeters.length)} of {sortedMeters.length} results
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 p-0 ${
                          currentPage === pageNum
                            ? 'bg-[var(--accent)] text-white'
                            : 'dark:bg-gray-800 dark:border-gray-600 dark:text-white'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Add a GaugeCard that matches the Daily Analysis gauge behavior (partial arc by percentage)
function GaugeCard({ title, value, unit = "m³", percent = 100, color = "#3b82f6", description }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  const start = 90; // top
  const end = start - (pct / 100) * 360;

  const data = [{ name: title, value: pct, fill: color }];

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mx-auto aspect-square max-h-[220px] w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={data}
              startAngle={start}
              endAngle={end}
              innerRadius="60%"
              outerRadius="90%"
            >
              <PolarGrid
                gridType="circle"
                radialLines={false}
                stroke="none"
                polarRadius={[86, 74]}
              />
              <RadialBar dataKey="value" background={{ fill: "#e5e7eb" }} cornerRadius={8} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 12}
                            className="fill-gray-900 dark:fill-white text-2xl font-bold"
                          >
                            {value.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 4}
                            className="fill-gray-500 dark:fill-gray-400 text-sm"
                          >
                            {unit}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-gray-600 dark:fill-gray-300 text-xs"
                          >
                            {pct.toFixed(1)}%
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
        {description && (
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Zone Hierarchy Visualization Component
function ZoneHierarchyView({ meters = [], selectedMonth = "", onZoneSelect = () => {} }) {
  const [expandedNodes, setExpandedNodes] = React.useState(new Set(["L1", "Zone_01_(FM)", "Zone_03_(A)", "Zone_03_(B)", "Zone_05", "Zone_08"]));

  const toggleNode = React.useCallback((nodeId) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Calculate consumption for a node based on meters
  const getNodeConsumption = React.useCallback((zonePath, level) => {
    if (!meters.length) return 0;
    
    return meters.reduce((total, meter) => {
      if (!meter.readings || !selectedMonth) return total;
      
      // Match based on zone and level
      const meterZone = (meter.zone || "").trim();
      const meterLevel = (meter.level || "").toUpperCase();
      
      if (zonePath && meterZone.includes(zonePath.replace("_", " ")) && meterLevel === level) {
        return total + (Number(meter.readings[selectedMonth]) || 0);
      }
      
      return total;
    }, 0);
  }, [meters, selectedMonth]);

  const renderHierarchyNode = React.useCallback((nodeKey, node, path = "", depth = 0) => {
    const fullPath = path ? `${path}.${nodeKey}` : nodeKey;
    const hasChildren = node.children && Object.keys(node.children).length > 0;
    const isExpanded = expandedNodes.has(nodeKey);
    const isZoneNode = node.level === "L2";
    const isDirectConnection = node.type === "Direct Connection";

    // Get consumption data
    const consumption = getNodeConsumption(nodeKey, node.level || "L2");
    
    const getIcon = () => {
      if (depth === 0) return <Droplets className="h-4 w-4 text-blue-600" />;
      if (isDirectConnection) return <Zap className="h-4 w-4 text-orange-500" />;
      if (isZoneNode) return <Building className="h-4 w-4 text-green-600" />;
      return <Users className="h-4 w-4 text-purple-500" />;
    };

    const getStatusColor = () => {
      if (consumption === 0) return "text-gray-500";
      if (consumption < 1000) return "text-yellow-600";
      if (consumption < 5000) return "text-green-600";
      return "text-red-600";
    };

    return (
      <div key={nodeKey} className="select-none">
        <div 
          className={`flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer transition-colors ${
            depth === 0 ? 'font-semibold text-gray-900 dark:text-white' : 
            depth === 1 ? 'font-medium text-gray-800 dark:text-gray-200' : 
            'text-gray-700 dark:text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (isZoneNode) {
              onZoneSelect(nodeKey);
            }
            if (hasChildren) {
              toggleNode(nodeKey);
            }
          }}
        >
          {hasChildren && (
            <button
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(nodeKey);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {getIcon()}
          <span className="flex-1">
            {node.label || nodeKey.replace(/_/g, " ")}
          </span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {consumption.toLocaleString()} m³
          </span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {Object.entries(node.children).map(([childKey, childNode]) =>
              renderHierarchyNode(childKey, childNode, fullPath, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, toggleNode, getNodeConsumption, onZoneSelect]);

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-600" />
          Water System Zone Hierarchy
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click on zone names to analyze. Consumption shown for {selectedMonth || "selected month"}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {Object.entries(ZONE_HIERARCHY.L1.children).map(([zoneKey, zoneData]) =>
            renderHierarchyNode(zoneKey, zoneData)
          )}
        </div>
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-green-600" />
              <span className="text-gray-600 dark:text-gray-300">Zone Bulk (L2)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-gray-600 dark:text-gray-300">Individual Meters (L3)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600 dark:text-gray-300">Direct Connections</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ZoneAnalysis({ meters = [], startDate = "2025-01", endDate = "2025-07" }) {
  // Build months from DB but prefer fixed Jan-25..Aug-25 if available
  const months = React.useMemo(() => {
    // collect months present in DB
    const monthSet = new Set();
    meters.forEach((m) => {
      Object.keys(m.readings || {}).forEach((k) => {if (parseMonthKey(k)) monthSet.add(k);});
    });
    const dbMonths = Array.from(monthSet).sort(compareMonthKey);

    // desired fixed window Jan-25..Aug-25
    const desiredMonths = getMonthsInRange("2025-01", "2025-08"); // ['Jan-25', ... 'Aug-25']
    const dbMonthsSet = new Set(dbMonths);
    const desiredPresent = desiredMonths.filter((m) => dbMonthsSet.has(m));

    if (desiredPresent.length > 0) {
      // Use only the desired fixed range that exists in DB
      return desiredMonths.filter((m) => dbMonthsSet.has(m));
    }

    // fallback to previously selected range intersection if provided
    const rangeMonths = getMonthsInRange(startDate, endDate);
    const rangeHasAllDb = dbMonths.length === 0 || rangeMonths.length > 0 && compareMonthKey(dbMonths[dbMonths.length - 1], rangeMonths[rangeMonths.length - 1]) <= 0;
    return rangeHasAllDb ? dbMonths.filter((m) => rangeMonths.includes(m)) : dbMonths;
  }, [meters, startDate, endDate]);

  // Build raw zones, then filter unwanted and aliases
  const rawZones = React.useMemo(() => {
    return Array.from(new Set(meters.map((m) => (m.zone || "").trim()).filter(Boolean)));
  }, [meters]);

  // filter zones by lower-cased banned list and hide DC/N/A
  const zones = React.useMemo(() => {
    return rawZones.
    filter((z) => !BANNED_ZONES_LOWER.has(z.toLowerCase())).
    filter((z) => !DC_ALIASES.includes(z.toLowerCase())).
    filter((z) => !NA_ALIASES.includes(z.toLowerCase())).
    sort((a, b) => a.localeCompare(b));
  }, [rawZones]);

  const [selectedZone, setSelectedZone] = React.useState("");
  const [selectedMonth, setSelectedMonth] = React.useState("");

  // Prefer default month from startDate if present in available months; fallback to last available
  React.useEffect(() => {
    if (months.length === 0) return;
    const preferred = formatYyyyMmToMonYY(startDate);
    if (preferred && months.includes(preferred)) {
      setSelectedMonth(preferred);
    } else {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, startDate]);

  // zoneMonthly now collects bulk (L2), l3, and l4 separately per zone/month
  const zoneMonthly = React.useMemo(() => {
    const map = {};
    meters.forEach((m) => {
      const zone = (m.zone || "").trim();
      if (!zone) return;
      if (!map[zone]) map[zone] = {};
      months.forEach((mon) => {
        const val = Number(m.readings?.[mon] || 0);
        if (!map[zone][mon]) map[zone][mon] = { bulk: 0, l3: 0, l4: 0 };
        if (isL2(m)) map[zone][mon].bulk += val; // Zone Bulk = L2 only
        if (isL3(m)) map[zone][mon].l3 += val; // L3 individuals
        if (isL4(m)) map[zone][mon].l4 += val; // L4 apartments/units
      });
    });
    return map;
  }, [meters, months]);

  const SPECIAL_DC = "__DC__";
  const SPECIAL_L1 = "__L1__";
  const SPECIAL_NA = "__NA__";
  const isSpecial = (val) => [SPECIAL_DC, SPECIAL_L1, SPECIAL_NA].includes(val);

  // Auto-pick default zone: Zone_01_(FM) if exists, otherwise highest loss, otherwise L1
  const highestLossZone = React.useMemo(() => {
    if (months.length === 0) return "";
    const last = months[months.length - 1];
    let worst = "";
    let worstLoss = -Infinity;
    zones.forEach((z) => {
      const rec = zoneMonthly[z]?.[last];
      if (!rec) return;
      const { bulk = 0, l3 = 0, l4 = 0 } = rec;
      // According to specifications: Individual Meters = L3 Total only
      const indiv = l3;
      const loss = bulk - indiv;
      const pct = bulk > 0 ? loss / bulk * 100 : -Infinity;
      if (pct > worstLoss) {
        worstLoss = pct;
        worst = z;
      }
    });
    return worst || "";
  }, [zones, zoneMonthly, months]);

  const autoSelectedRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoSelectedRef.current) {
      const preferredZone = zones.find((z) => z === "Zone_01_(FM)") || highestLossZone || SPECIAL_L1;
      setSelectedZone(preferredZone);
      autoSelectedRef.current = true;
    }
  }, [zones, highestLossZone]);

  const sumByPredicate = React.useCallback((mon, predicate) => {
    return meters.reduce((acc, m) => {
      if (!predicate(m)) return acc;
      const val = Number(m.readings?.[mon] || 0);
      return acc + val;
    }, 0);
  }, [meters]);

  const isDirectConnectionMeter = (m) => {
    const z = (m.zone || "").toLowerCase().trim();
    return DC_ALIASES.includes(z);
  };
  const isNAMeter = (m) => {
    const z = (m.zone || "").toLowerCase().trim();
    return NA_ALIASES.includes(z);
  };

  // Trend series uses zone-specific L4 rule (include L4 except for Zone_03_(A)/(B))
  const zoneTrends = React.useMemo(() => {
    if (!selectedZone || months.length === 0) return [];
    if (isSpecial(selectedZone)) {
      return months.map((mon) => {
        const bulk =
        selectedZone === SPECIAL_DC ?
        sumByPredicate(mon, isDirectConnectionMeter) :
        selectedZone === SPECIAL_L1 ?
        sumByPredicate(mon, (m) => (m.level || "").toUpperCase() === "L1") :
        sumByPredicate(mon, isNAMeter);
        return { month: mon, bulk, individual: bulk, loss: 0 };
      });
    }
    return months.map((mon) => {
      const rec = zoneMonthly[selectedZone]?.[mon] || { bulk: 0, l3: 0, l4: 0 };
      // According to specifications: Individual Meters = L3 Total only
      const indiv = rec.l3;
      const loss = rec.bulk - indiv;
      return { month: mon, bulk: rec.bulk, individual: indiv, loss };
    });
  }, [selectedZone, months, zoneMonthly, sumByPredicate]);

  // Metrics: Zone Bulk = L2 only; Individual Meters = L3 Total only; Water Loss = L2 - L3
  const metrics = React.useMemo(() => {
    if (!selectedMonth || !selectedZone) {
      return { zoneBulk: 0, individualSum: 0, loss: 0, lossPercentage: "0.0", efficiency: "0.0", status: getZoneStatus(0) };
    }
    if (isSpecial(selectedZone)) {
      const zoneBulk =
      selectedZone === SPECIAL_DC ?
      sumByPredicate(selectedMonth, isDirectConnectionMeter) :
      selectedZone === SPECIAL_L1 ?
      sumByPredicate(selectedMonth, (m) => (m.level || "").toUpperCase() === "L1") :
      sumByPredicate(selectedMonth, isNAMeter);
      const individualSum = zoneBulk;
      const loss = 0;
      const lossPercentage = "0.0";
      const efficiency = zoneBulk > 0 ? "100.0" : "0.0";
      const status = getZoneStatus(0, { zoneBulk, hasIndividuals: true });
      return { zoneBulk, individualSum, loss, lossPercentage, efficiency, status };
    }

    const rec = zoneMonthly[selectedZone]?.[selectedMonth] || { bulk: 0, l3: 0, l4: 0 };
    
    // According to specifications:
    // Zone Bulk = L2 only
    const zoneBulk = rec.bulk;
    
    // Individual Meters = L3 Total only (not including L4)
    const individualSum = rec.l3;
    
    // Water Loss = Difference = L2(zone Bulk) - L3(total)
    const loss = zoneBulk - individualSum;
    
    // Debug logging to help troubleshoot data issues
    if (selectedZone === "Zone_01_(FM)" && selectedMonth === "Jan-25") {
      console.log("Zone Analysis Debug:", {
        selectedZone,
        selectedMonth,
        rec,
        zoneBulk,
        individualSum,
        loss,
        l2Meters: meters.filter(m => m.zone === selectedZone && isL2(m)),
        l3Meters: meters.filter(m => m.zone === selectedZone && isL3(m))
      });
    }
    const rawLossPct = zoneBulk > 0 ? loss / zoneBulk * 100 : 0;
    const lossPercentage = rawLossPct.toFixed(1);
    const efficiency = zoneBulk > 0 ? Math.max(0, Math.min(100, individualSum / zoneBulk * 100)).toFixed(1) : "0.0";
    const status = getZoneStatus(rawLossPct, { zoneBulk, hasIndividuals: individualSum > 0 });
    return { zoneBulk, individualSum, loss, lossPercentage, efficiency, status };
  }, [selectedZone, selectedMonth, zoneMonthly, sumByPredicate]);

  // Individual meters table (ALL L3 meters in the zone; keep L3 only to avoid double counting per spec)
  const monthsForTable = React.useMemo(() => months.slice(-5), [months]);
  const zoneIndividualMeters = React.useMemo(() => {
    if (isSpecial(selectedZone)) return [];
    const z = (selectedZone || "").trim();
    if (!z) return [];
    const list = meters.filter((m) => (m.zone || "").trim() === z && isL3(m));
    return list.map((m) => {
      const type = isVilla(m) ? "Residential (Villa)" : "Building Bulk";
      const row = {
        label: m.meter_label || "-",
        account: m.account_number || "-",
        type
      };
      let total = 0;
      monthsForTable.forEach((mon, idx) => {
        const v = Number(m.readings?.[mon] || 0);
        total += v;
        row[`m${idx}`] = v;
      });
      row.total = total;
      row.status = total > 0 ? "active" : "inactive";
      row.statusLabel = total > 0 ? "Active" : "Inactive";
      return row;
    });
  }, [meters, selectedZone, monthsForTable]);

  // Building/Villa counts (L3 only)
  const counts = React.useMemo(() => {
    if (isSpecial(selectedZone)) return { villas: 0, buildings: 0 };
    let villas = 0,buildings = 0;
    zoneIndividualMeters.forEach((r) => {if (r.type === "Building Bulk") buildings++;else villas++;});
    return { villas, buildings };
  }, [zoneIndividualMeters, selectedZone]);

  const resetFilters = () => {
    if (months.length > 0) setSelectedMonth(months[months.length - 1] || "");
    const preferredZone = zones.find((z) => z === "Zone_01_(FM)") || highestLossZone || SPECIAL_L1;
    setSelectedZone(preferredZone);
  };

  // Drill-down: L4 children for a building bulk row
  const [openBuildingDialog, setOpenBuildingDialog] = React.useState(false);
  const [dialogBuilding, setDialogBuilding] = React.useState(null);
  const l4Children = React.useMemo(() => {
    if (!dialogBuilding) return [];
    const children = meters.filter((m) =>
    isL4(m) && (m.parent_meter || "").trim() === (dialogBuilding.label || "").trim()
    );
    return children.map((m) => {
      const row = { label: m.meter_label || "-", account: m.account_number || "-", type: "L4 Apartment/Unit" };
      let total = 0;
      monthsForTable.forEach((mon, idx) => {
        const v = Number(m.readings?.[mon] || 0);
        total += v;
        row[`m${idx}`] = v;
      });
      row.total = total;
      return row;
    });
  }, [dialogBuilding, meters, monthsForTable]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Select Month</span>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-white">
                  {months.map((m) =>
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Filter by Zone</span>
              <Select value={selectedZone} onValueChange={setSelectedZone}>
                <SelectTrigger className="w-56 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:text-white">
                  {/* Special options */}
                  <SelectItem value={SPECIAL_DC}>Direct Connection (DC)</SelectItem>
                  <SelectItem value={SPECIAL_L1}>Main Bulk (L1)</SelectItem>
                  <SelectItem value={SPECIAL_NA}>N/A (N/A)</SelectItem>
                  {/* Normal zones (filtered) */}
                  {zones.map((z) =>
                  <SelectItem key={z} value={z}>{prettyZone(z)}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white" onClick={resetFilters}>
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {isSpecial(selectedZone) ?
          selectedZone === SPECIAL_DC ? "Direct Connection (DC)" : selectedZone === SPECIAL_L1 ? "Main Bulk (L1)" : "N/A (N/A)" :
          prettyZone(selectedZone) || "-"} Analysis for {selectedMonth || "-"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Zone Bulk = L2 only • Individual Meters = L3 Total only • Water Loss = L2(zone Bulk) − L3(total)
        </p>
      </div>

      {/* Enhanced Radial Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GaugeCard
          title="Zone Bulk Meter Total"
          value={metrics.zoneBulk}
          unit="m³"
          percent={100}
          color="#3b82f6"
          description={`Total input for ${prettyZone(selectedZone || "-")} • ${selectedMonth || "-"}`}
        />
        <GaugeCard
          title={`Individual Meters Sum Total`}
          value={metrics.individualSum}
          unit="m³"
          percent={Number(metrics.efficiency)}
          color="#10b981"
          description={`Recorded by individual meters (${Number(metrics.efficiency).toFixed(1)}%)`}
        />
        <GaugeCard
          title="Water Loss Distribution"
          value={metrics.loss}
          unit="m³"
          percent={Math.abs(Number(metrics.lossPercentage))}
          color={metrics.loss >= 0 ? "#dc2626" : "#10b981"}
          description={metrics.loss >= 0 ? "Unaccounted for water" : "System gain (L3 > L2)"}
        />
      </div>

      {/* Enhanced Trend chart with red loss color */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Zone Consumption Trend</CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSpecial(selectedZone) ?
            "Bulk equals Individual; Loss remains zero by rule." :
            "Monthly comparison of L2 (bulk) vs L3 totals"}
          </p>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={zoneTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="bulk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ind" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="loss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} m³`]} />
              <Legend />
              <Area 
                type="monotone" 
                name="Individual Total" 
                dataKey="individual" 
                stroke="#10b981" 
                strokeWidth={2}
                fill="url(#ind)" 
                stackId="1"
                dot={false}
              />
              <Area 
                type="monotone" 
                name="Loss" 
                dataKey="loss" 
                stroke="#ef4444" 
                strokeWidth={2}
                fill="url(#loss)" 
                stackId="1"
                dot={false}
              />
              <Area 
                type="monotone" 
                name="Zone Bulk" 
                dataKey="bulk" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fill="url(#bulk)" 
                stackId="2"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Enhanced Individual Meters Table */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            {isSpecial(selectedZone) ? "Individual Meters (hidden for category view)" : `Individual Meters - Zone ${prettyZone(selectedZone)}`}
          </CardTitle>
          {!isSpecial(selectedZone) && <p className="text-sm text-gray-500 dark:text-gray-400">All individual meters (L3 Villas + L3 Building Bulk) in this zone</p>}
        </CardHeader>
        <CardContent>
          {isSpecial(selectedZone) ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">For Direct Connection (DC), Main Bulk (L1), and N/A categories, gauges assume zero loss by definition; detailed meter list is not shown.</div>
          ) : (
            <EnhancedMeterTable
              meters={zoneIndividualMeters}
              monthsForTable={monthsForTable}
              selectedZone={selectedZone}
              onBuildingClick={(building) => {
                setDialogBuilding(building);
                setOpenBuildingDialog(true);
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={openBuildingDialog} onOpenChange={setOpenBuildingDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>L4 Meters under: {dialogBuilding?.label}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="py-2 pr-4">L4 Meter Label</th>
                  <th className="py-2 pr-4">Account #</th>
                  <th className="py-2 pr-4">Type</th>
                  {monthsForTable.map((m) =>
                  <th key={m} className="py-2 pr-4">{m}</th>
                  )}
                  <th className="py-2 pr-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {l4Children.length === 0 ?
                <tr><td colSpan={5 + monthsForTable.length} className="py-6 text-center text-gray-500">No L4 meters found for this building.</td></tr> :
                l4Children.map((r, idx) =>
                <tr key={idx} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-4">{r.label}</td>
                    <td className="py-2 pr-4">{r.account}</td>
                    <td className="py-2 pr-4"><span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs">{r.type}</span></td>
                    {monthsForTable.map((m, i) =>
                  <td key={m} className="py-2 pr-4">{Number(r[`m${i}`] || 0).toLocaleString()}</td>
                  )}
                    <td className="py-2 pr-4 font-semibold">{r.total.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Zone Hierarchy Visualization */}
      <ZoneHierarchyView 
        meters={meters}
        selectedMonth={selectedMonth}
        onZoneSelect={(zoneKey) => {
          setSelectedZone(zoneKey);
        }}
      />
    </div>
  );
}

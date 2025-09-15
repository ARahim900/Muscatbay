import React, { useState, useEffect } from "react";
import { FireSafetyEquipment } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ShieldCheck, HardHat, AlertTriangle, Wrench, Search, Edit, Save, X, CheckCircle, AlertCircle, Plus, Building, Calendar, User, Settings } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

import TabNavigation from "../components/shared/TabNavigation";
import StatsGrid from "../components/shared/StatsGrid";

const statusConfig = {
  Operational: { color: "var(--color-success)", icon: ShieldCheck },
  "Needs Attention": { color: "var(--color-warning)", icon: AlertTriangle },
  Expired: { color: "var(--color-alert)", icon: AlertTriangle },
  "Maintenance Due": { color: "orange", icon: Wrench },
};

const priorityConfig = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

export default function Firefighting() {
  const [equipment, setEquipment] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  
  // Modal and editing state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    status: "Operational",
    priority: "Medium",
    battery: "",
    signal: "",
    next_maintenance: "",
    inspector: "",
    type: "",
    zone: ""
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Configuration - similar to HVAC
  const config = {
    locationOptions: ["All", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "CIF Building", "FM Building"],
    statusOptions: ["All", "Operational", "Needs Attention", "Expired", "Maintenance Due"],
    priorityOptions: ["Critical", "High", "Medium", "Low"],
    typeOptions: ["All", "Fire Alarm Panel", "Smoke Detector", "Heat Detector", "Manual Call Point", "Fire Extinguisher", "Sprinkler System", "Emergency Light", "Fire Door"]
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: Settings },
    { key: 'equipment', label: 'Equipment Records', icon: ShieldCheck },
    { key: 'maintenance', label: 'Maintenance Schedule', icon: Calendar }
  ];

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('storage', handleThemeChange);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
                setTheme(newTheme);
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true });

    loadFirefightingData();

    return () => {
      window.removeEventListener('storage', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const loadFirefightingData = async () => {
    setIsLoading(true);
    try {
      const data = await FireSafetyEquipment.list();
      setEquipment(data);
    } catch (error) {
      console.error("Error loading firefighting equipment:", error);
      setErrorMessage("Failed to load firefighting equipment data");
    }
    setIsLoading(false);
  };

  const openModal = (equipmentItem = null) => {
    if (equipmentItem) {
      setEditingEquipment(equipmentItem);
      setFormData({
        name: equipmentItem.name || "",
        location: equipmentItem.location || "",
        status: equipmentItem.status || "Operational",
        priority: equipmentItem.priority || "Medium",
        battery: equipmentItem.battery?.toString() || "",
        signal: equipmentItem.signal?.toString() || "",
        next_maintenance: equipmentItem.next_maintenance || "",
        inspector: equipmentItem.inspector || "",
        type: equipmentItem.type || "",
        zone: equipmentItem.zone || ""
      });
    } else {
      setEditingEquipment(null);
      setFormData({
        name: "",
        location: "",
        status: "Operational",
        priority: "Medium",
        battery: "",
        signal: "",
        next_maintenance: "",
        inspector: "",
        type: "",
        zone: ""
      });
    }
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setErrorMessage("");
  };

  const saveEquipment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        throw new Error("Equipment name is required");
      }
      if (!formData.location?.trim()) {
        throw new Error("Location is required");
      }

      // Convert battery and signal to numbers
      const equipmentData = {
        ...formData,
        battery: formData.battery ? parseInt(formData.battery) : null,
        signal: formData.signal ? parseInt(formData.signal) : null
      };

      if (editingEquipment) {
        await FireSafetyEquipment.update(editingEquipment.id, equipmentData);
        setEquipment(equipment.map(item => 
          item.id === editingEquipment.id ? { ...item, ...equipmentData } : item
        ));
        setSuccessMessage("Fire safety equipment updated successfully!");
      } else {
        const savedEquipment = await FireSafetyEquipment.create(equipmentData);
        setEquipment([...equipment, savedEquipment]);
        setSuccessMessage("Fire safety equipment created successfully!");
      }

      closeModal();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving fire safety equipment:", error);
      setErrorMessage(error.message || "Failed to save fire safety equipment");
    }
    setSaving(false);
  };

  const deleteEquipment = async (equipmentId) => {
    if (window.confirm("Are you sure you want to delete this equipment? This action cannot be undone.")) {
      try {
        await FireSafetyEquipment.delete(equipmentId);
        setEquipment(equipment.filter(item => item.id !== equipmentId));
        setSuccessMessage("Fire safety equipment deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        console.error("Error deleting fire safety equipment:", error);
        setErrorMessage("Failed to delete fire safety equipment");
      }
    }
  };

  // Filter equipment
  const filteredEquipment = equipment.filter(item => {
    const matchesLocation = selectedLocation === "All" || 
      (item.location && item.location.toLowerCase().includes(selectedLocation.toLowerCase()));
    
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
    
    const matchesType = selectedType === "All" || 
      (item.type && item.type.toLowerCase().includes(selectedType.toLowerCase()));
    
    const matchesSearch = searchTerm === "" || 
      Object.values(item).some(value =>
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesLocation && matchesStatus && matchesType && matchesSearch;
  });

  const getAvailableLocations = () => {
    const locationsInData = [...new Set(equipment.map(item => item.location).filter(Boolean))];
    const allLocations = ["All", ...new Set([...config.locationOptions.filter(l => l !== "All"), ...locationsInData])];
    return allLocations;
  };

  const getAvailableTypes = () => {
    const typesInData = [...new Set(equipment.map(item => item.type).filter(Boolean))];
    const allTypes = ["All", ...new Set([...config.typeOptions.filter(t => t !== "All"), ...typesInData])];
    return allTypes;
  };

  const availableLocations = getAvailableLocations();
  const availableTypes = getAvailableTypes();
  
  const statusDistribution = equipment.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.entries(statusDistribution).map(([name, value]) => ({ name, value }));
  const COLORS = ["#00D2B3", "#FFD166", "#FF6B6B", "#FFA500"];

  const equipmentTypeDistribution = equipment.reduce((acc, item) => {
    const type = item.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  const typeChartData = Object.entries(equipmentTypeDistribution).map(([name, value]) => ({ name, value }));

  const getFireSafetyStats = () => {
    const total = equipment.length;
    const operational = statusDistribution['Operational'] || 0;
    const critical = equipment.filter(e => e.priority === 'Critical').length;
    const maintenanceDue = statusDistribution['Maintenance Due'] || 0;
    const needsAttention = statusDistribution['Needs Attention'] || 0;
    const expired = statusDistribution['Expired'] || 0;
    const avgBattery = equipment.filter(e => e.battery !== null).length > 0 ? 
      Math.round(equipment.filter(e => e.battery !== null).reduce((sum, e) => sum + e.battery, 0) / equipment.filter(e => e.battery !== null).length) : 0;
    const avgSignal = equipment.filter(e => e.signal !== null).length > 0 ? 
      Math.round(equipment.filter(e => e.signal !== null).reduce((sum, e) => sum + e.signal, 0) / equipment.filter(e => e.signal !== null).length) : 0;

    return [
      { label: 'TOTAL EQUIPMENT', value: total.toString(), subtitle: 'All safety systems', icon: HardHat },
      { label: 'OPERATIONAL', value: operational.toString(), subtitle: 'Working properly', icon: ShieldCheck },
      { label: 'CRITICAL PRIORITY', value: critical.toString(), subtitle: 'Requires attention', icon: AlertTriangle },
      { label: 'MAINTENANCE DUE', value: maintenanceDue.toString(), subtitle: 'Service required', icon: Wrench },
      { label: 'NEEDS ATTENTION', value: needsAttention.toString(), subtitle: 'Issues reported', icon: AlertTriangle },
      { label: 'EXPIRED EQUIPMENT', value: expired.toString(), subtitle: 'Past expiry date', icon: AlertCircle },
      { label: 'AVG BATTERY', value: `${avgBattery}%`, subtitle: 'Battery level', icon: Settings },
      { label: 'AVG SIGNAL', value: `${avgSignal}%`, subtitle: 'Signal strength', icon: Settings }
    ];
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Operational': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Needs Attention': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Expired': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'Maintenance Due': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'Critical': 'bg-red-500 text-white',
      'High': 'bg-orange-500 text-white',
      'Medium': 'bg-yellow-500 text-white',
      'Low': 'bg-green-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const chartStrokeColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
  const chartGridColor = theme === 'dark' ? '#4b5563' : '#e5e7eb';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    border: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
    color: theme === 'dark' ? '#f3f4f6' : '#1f2937',
    backdropFilter: 'blur(5px)',
    borderRadius: '0.5rem',
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <StatsGrid stats={getFireSafetyStats()} />
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">System Status Distribution</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusChartData} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={80} 
                  outerRadius={110}
                  paddingAngle={5}
                  cornerRadius={10}
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={theme === 'dark' ? '#374151' : '#ffffff'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                 <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central" className="text-4xl font-bold fill-gray-800 dark:fill-white">
                  {equipment.length}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="central" className="text-sm fill-gray-500 dark:fill-gray-400">
                  Total Systems
                </text>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader><CardTitle className="text-gray-900 dark:text-white">Equipment by Type</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeChartData} layout="vertical" margin={{left: 30}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chartGridColor} />
                <XAxis type="number" hide stroke={chartStrokeColor} />
                <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} stroke={chartStrokeColor} />
                <Tooltip 
                  cursor={{fill: theme === 'dark' ? 'rgba(75, 85, 99, 0.3)' : 'rgba(243, 244, 246, 0.5)'}}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="value" fill="var(--accent)" barSize={25} radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderEquipmentRecords = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Location Filter */}
            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Locations:</p>
              {availableLocations.map(location => {
                const isSelected = selectedLocation === location;
                const recordCount = location === "All" ? equipment.length : 
                  equipment.filter(item => item.location && 
                    item.location.toLowerCase().includes(location.toLowerCase())
                  ).length;
                
                return (
                  <Button
                    key={location}
                    onClick={() => setSelectedLocation(location)}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`${
                      isSelected 
                        ? 'bg-[var(--accent)] text-white shadow-md' 
                        : 'dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {location}
                    <span className="ml-1 text-xs opacity-75">({recordCount})</span>
                  </Button>
                );
              })}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Status:</p>
              {config.statusOptions.map(status => {
                const isSelected = selectedStatus === status;
                const recordCount = status === "All" ? equipment.length : 
                  equipment.filter(item => item.status === status).length;
                
                return (
                  <Button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`${
                      isSelected 
                        ? 'bg-[var(--accent)] text-white shadow-md' 
                        : 'dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status}
                    <span className="ml-1 text-xs opacity-75">({recordCount})</span>
                  </Button>
                );
              })}
            </div>

            {/* Clear Filters */}
            {(selectedLocation !== "All" || selectedStatus !== "All" || selectedType !== "All" || searchTerm !== "") && (
              <Button
                onClick={() => {
                  setSelectedLocation("All");
                  setSelectedStatus("All");
                  setSelectedType("All");
                  setSearchTerm("");
                }}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filter Summary */}
          {(selectedLocation !== "All" || selectedStatus !== "All" || selectedType !== "All" || searchTerm !== "") && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Showing {filteredEquipment.length} of {equipment.length} equipment
                {selectedLocation !== "All" && ` • Location: ${selectedLocation}`}
                {selectedStatus !== "All" && ` • Status: ${selectedStatus}`}
                {selectedType !== "All" && ` • Type: ${selectedType}`}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search fire safety equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-900 dark:text-white">Loading fire safety equipment...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => (
            <Card key={item.id} className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={`${getStatusBadge(item.status)} border-transparent`}>
                      {item.status}
                    </Badge>
                    <Badge className={`${getPriorityBadge(item.priority)} border-transparent ml-2`}>
                      {item.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">{item.name}</p>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {item.location} - {item.type || 'Unknown Type'}
                  </p>
                  
                  {item.zone && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Zone: {item.zone}
                    </p>
                  )}
                  
                  {/* Battery and Signal Progress Bars */}
                  {(item.battery !== null || item.signal !== null) && (
                    <div className="space-y-2 mb-4">
                      {item.battery !== null && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Battery</span>
                            <span>{item.battery}%</span>
                          </div>
                          <Progress value={item.battery} className="h-2" />
                        </div>
                      )}
                      {item.signal !== null && (
                        <div>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>Signal</span>
                            <span>{item.signal}%</span>
                          </div>
                          <Progress value={item.signal} className="h-2" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {item.next_maintenance && (
                    <div className="flex items-center gap-1 mb-3">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span className="text-xs text-blue-600">Next: {formatDate(item.next_maintenance)}</span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-3 flex justify-between items-center rounded-b-lg">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Inspector: {item.inspector || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openModal(item)}
                      className="text-xs h-7 px-2 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteEquipment(item.id)}
                      className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {filteredEquipment.length === 0 && !isLoading && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No fire safety equipment found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {selectedLocation !== "All" || selectedStatus !== "All" || selectedType !== "All" || searchTerm !== ""
                ? "Try adjusting your filters or search terms" 
                : "Start by adding your first fire safety equipment"}
            </p>
            {(selectedLocation !== "All" || selectedStatus !== "All" || selectedType !== "All" || searchTerm !== "") && (
              <Button
                onClick={() => {
                  setSelectedLocation("All");
                  setSelectedStatus("All");
                  setSelectedType("All");
                  setSearchTerm("");
                }}
                variant="outline"
                className="mt-2"
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {successMessage && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200">{successMessage}</span>
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-red-800 dark:text-red-200">{errorMessage}</span>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Firefighting & Alarm System Tracker</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Comprehensive fire safety equipment monitoring and maintenance tracking
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openModal()} 
              className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingEquipment ? 'Edit Fire Safety Equipment' : 'Add New Fire Safety Equipment'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={saveEquipment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Equipment Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Fire Alarm Panel"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Location *
                  </label>
                  <Select 
                    value={formData.location} 
                    onValueChange={(value) => setFormData({...formData, location: value})}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:text-white">
                      {config.locationOptions.filter(l => l !== "All").map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Equipment Type
                  </label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value})}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:text-white">
                      {config.typeOptions.filter(t => t !== "All").map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Zone
                  </label>
                  <Input
                    value={formData.zone}
                    onChange={(e) => setFormData({...formData, zone: e.target.value})}
                    placeholder="e.g., Zone A, Ground Floor"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({...formData, status: value})}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:text-white">
                      {config.statusOptions.filter(s => s !== "All").map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData({...formData, priority: value})}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:text-white">
                      {config.priorityOptions.map(priority => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Battery Level (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.battery}
                    onChange={(e) => setFormData({...formData, battery: e.target.value})}
                    placeholder="0-100"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Signal Strength (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.signal}
                    onChange={(e) => setFormData({...formData, signal: e.target.value})}
                    placeholder="0-100"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Next Maintenance Date
                  </label>
                  <Input
                    type="date"
                    value={formData.next_maintenance}
                    onChange={(e) => setFormData({...formData, next_maintenance: e.target.value})}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    Inspector
                  </label>
                  <Input
                    value={formData.inspector}
                    onChange={(e) => setFormData({...formData, inspector: e.target.value})}
                    placeholder="e.g., Ahmed Al-Rashid"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeModal}
                  className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {editingEquipment ? 'Update Equipment' : 'Create Equipment'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'equipment' && renderEquipmentRecords()}
      {activeTab === 'maintenance' && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">Maintenance Schedule Management</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Coming soon - Scheduled fire safety equipment maintenance tracking
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
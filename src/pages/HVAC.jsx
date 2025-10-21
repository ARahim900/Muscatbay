
import React, { useState, useEffect } from "react";
import { HvacMaintenanceLog } from "@/lib/entities";
import { MaintenanceSchedule } from "@/lib/entities";
import { MaintenanceHistory } from "@/lib/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Edit, Save, X, CheckCircle, Building, AlertCircle, Plus, Calendar, User, Clock, Settings, History, FileText, AlertTriangle, CheckSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

import TabNavigation from "@/components/TabNavigation";
import StatsGrid from "@/components/StatsGrid";

export default function HVAC() {
  // Core state
  const [logs, setLogs] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('maintenance'); // 'maintenance' or 'schedule'
  const [editingLog, setEditingLog] = useState(null);
  const [formData, setFormData] = useState({
    building: "",
    record_type: "PPM (Preventative)",
    main_system: "",
    equipment: "",
    equipment_id: "",
    technician: "",
    contractor_company: "",
    date: "",
    start_time: "",
    end_time: "",
    status: "Scheduled",
    priority: "Medium",
    common_issues: "",
    work_performed: "",
    parts_replaced: "",
    notes: "",
    next_service_date: "",
    compliance_standard: "ASHRAE",
    energy_efficiency_rating: 3,
    safety_check_passed: false,
    warranty_status: "N/A"
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Configuration - centralized options following international standards
  const config = {
    buildingOptions: ["All", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "CIF Building", "FM Building"],
    recordTypes: ['PPM (Preventative)', 'Corrective Maintenance', 'Inspection', 'Emergency Repair', 'Routine Check'],
    statusOptions: ['All', 'Scheduled', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
    priorityOptions: ['Low', 'Medium', 'High', 'Critical'],
    complianceStandards: ['ASHRAE', 'ISO 50001', 'EN 15232', 'Local Standards'],
    warrantyStatuses: ['Under Warranty', 'Expired', 'Extended', 'N/A']
  };

  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: Settings },
    { key: 'maintenance', label: 'Maintenance Records', icon: FileText },
    { key: 'schedule', label: 'PPM Schedule', icon: Calendar },
    { key: 'history', label: 'Activity History', icon: History }
  ];

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [maintenanceLogs, maintenanceSchedules, maintenanceHistory] = await Promise.all([
        HvacMaintenanceLog.list().catch(err => {
          console.warn("HvacMaintenanceLog.list() failed:", err);
          return [];
        }),
        MaintenanceSchedule.list().catch(err => {
          console.warn("MaintenanceSchedule.list() failed:", err);
          return [];
        }),
        MaintenanceHistory.list().catch(err => {
          console.warn("MaintenanceHistory.list() failed:", err);
          return [];
        })
      ]);
      
      setLogs(Array.isArray(maintenanceLogs) ? maintenanceLogs : []);
      setSchedules(Array.isArray(maintenanceSchedules) ? maintenanceSchedules : []);
      setHistory(Array.isArray(maintenanceHistory) ? maintenanceHistory : []);
    } catch (error) {
      console.error("Error loading HVAC data:", error);
      setErrorMessage("Failed to load HVAC data. Please check your connection and try again.");
    }
    setIsLoading(false);
  };

  // Create activity history record
  const createHistoryRecord = async (logId, actionType, description, oldStatus = null, newStatus = null) => {
    try {
      const historyData = {
        maintenance_log_id: logId,
        equipment_id: formData.equipment_id || `EQ-${Date.now()}`,
        action_type: actionType,
        performed_by: formData.technician || 'System User',
        user_role: 'Technician',
        old_status: oldStatus,
        new_status: newStatus,
        description: description,
        location: formData.building
      };
      
      await MaintenanceHistory.create(historyData);
    } catch (error) {
      console.warn("Failed to create history record:", error);
    }
  };

  const openModal = (log = null, type = 'maintenance') => {
    setModalType(type);
    if (log) {
      setEditingLog(log);
      setFormData({
        building: log.building || "",
        record_type: log.record_type || "PPM (Preventative)",
        main_system: log.main_system || "",
        equipment: log.equipment || "",
        equipment_id: log.equipment_id || "",
        technician: log.technician || "",
        contractor_company: log.contractor_company || "",
        date: log.date || "",
        start_time: log.start_time || "",
        end_time: log.end_time || "",
        status: log.status || "Scheduled",
        priority: log.priority || "Medium",
        common_issues: log.common_issues || "",
        work_performed: log.work_performed || "",
        parts_replaced: log.parts_replaced || "",
        notes: log.notes || "",
        next_service_date: log.next_service_date || "",
        compliance_standard: log.compliance_standard || "ASHRAE",
        energy_efficiency_rating: log.energy_efficiency_rating || 3,
        safety_check_passed: log.safety_check_passed || false,
        warranty_status: log.warranty_status || "N/A"
      });
    } else {
      setEditingLog(null);
      setFormData({
        building: "",
        record_type: "PPM (Preventative)",
        main_system: "",
        equipment: "",
        equipment_id: "",
        technician: "",
        contractor_company: "",
        date: "",
        start_time: "",
        end_time: "",
        status: "Scheduled",
        priority: "Medium",
        common_issues: "",
        work_performed: "",
        parts_replaced: "",
        notes: "",
        next_service_date: "",
        compliance_standard: "ASHRAE",
        energy_efficiency_rating: 3,
        safety_check_passed: false,
        warranty_status: "N/A"
      });
    }
    setIsModalOpen(true);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
    setModalType('maintenance');
    setErrorMessage("");
  };

  const saveRecord = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage("");

    try {
      // Validate required fields
      const requiredFields = [
        { key: 'building', label: 'Building' },
        { key: 'record_type', label: 'Record Type' },
        { key: 'main_system', label: 'Main System' },
        { key: 'equipment', label: 'Equipment' },
        { key: 'date', label: 'Date of Service' }
      ];

      for (const field of requiredFields) {
        if (!formData[field.key] || !formData[field.key].toString().trim()) {
          throw new Error(`Please fill out the "${field.label}" field.`);
        }
      }

      // Generate equipment ID if not provided
      if (!formData.equipment_id) {
        formData.equipment_id = `${formData.building}-${formData.main_system}-${Date.now()}`;
      }

      const oldStatus = editingLog?.status;
      const logData = { ...formData };

      let savedLog;
      if (editingLog) {
        savedLog = await HvacMaintenanceLog.update(editingLog.id, logData);
        setLogs(logs.map(log => 
          log.id === editingLog.id ? { ...log, ...logData } : log
        ));
        
        // Create history record for status change
        if (oldStatus && oldStatus !== logData.status) {
          await createHistoryRecord(
            editingLog.id,
            "Status Update",
            `Status changed from ${oldStatus} to ${logData.status}`,
            oldStatus,
            logData.status
          );
        }
        
        setSuccessMessage("HVAC maintenance record updated successfully!");
      } else {
        savedLog = await HvacMaintenanceLog.create(logData);
        setLogs([...logs, savedLog]);
        
        // Create history record for new log
        await createHistoryRecord(
          savedLog.id,
          "Work Started",
          `New ${logData.record_type} scheduled for ${logData.equipment}`,
          null,
          logData.status
        );
        
        setSuccessMessage("HVAC maintenance record created successfully!");
      }

      closeModal();
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Refresh history data
      const updatedHistory = await MaintenanceHistory.list().catch(() => []);
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
      
    } catch (error) {
      console.error("Error saving HVAC log:", error);
      setErrorMessage(error.message || "Failed to save HVAC record. Please try again.");
    }
    setSaving(false);
  };

  const deleteRecord = async (logId) => {
    if (window.confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      try {
        await HvacMaintenanceLog.delete(logId);
        setLogs(logs.filter(log => log.id !== logId));
        setSuccessMessage("HVAC record deleted successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        console.error("Error deleting HVAC log:", error);
        setErrorMessage("Failed to delete HVAC record");
      }
    }
  };

  // Updated filter logic - Fixed building matching
  const filteredLogs = logs.filter(log => {
    // Building filter - improved matching logic
    const matchesBuilding = selectedBuilding === "All" || 
      (log.building && 
        (log.building === selectedBuilding || 
         log.building.toLowerCase() === selectedBuilding.toLowerCase() ||
         log.building.toLowerCase().includes(selectedBuilding.toLowerCase()) ||
         selectedBuilding.toLowerCase().includes(log.building.toLowerCase())
        )
      );
    
    // Status filter
    const matchesStatus = selectedStatus === "All" || 
      (log.status && log.status === selectedStatus);
    
    // Search term filter
    const matchesSearch = searchTerm === "" || 
      Object.values(log).some(value =>
        String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    return matchesBuilding && matchesStatus && matchesSearch;
  });

  // Debug function to check current filters (can be removed later)
  const debugFilters = () => {
    console.log("Current Filters:", {
      selectedBuilding,
      selectedStatus,
      searchTerm,
      totalLogs: logs.length,
      filteredLogs: filteredLogs.length,
      availableBuildings: [...new Set(logs.map(log => log.building).filter(Boolean))]
    });
  };

  // Helper function to get available buildings from actual data
  const getAvailableBuildings = () => {
    const buildingsInData = [...new Set(logs.map(log => log.building).filter(Boolean))];
    // Merge with config buildings to ensure consistency
    const allBuildings = ["All", ...new Set([...config.buildingOptions.filter(b => b !== "All"), ...buildingsInData])];
    return allBuildings;
  };

  // Updated building options to include actual data
  const availableBuildings = getAvailableBuildings();

  // Statistics calculation
  const getMaintenanceStats = () => {
    const total = logs.length;
    const scheduled = logs.filter(log => log.status === 'Scheduled').length;
    const inProgress = logs.filter(log => log.status === 'In Progress').length;
    const completed = logs.filter(log => log.status === 'Completed').length;
    const overdue = logs.filter(log => {
      const serviceDate = new Date(log.date);
      const today = new Date();
      return log.status === 'Scheduled' && serviceDate < today;
    }).length;
    const ppmCount = logs.filter(log => log.record_type === 'PPM (Preventative)').length;
    const criticalCount = logs.filter(log => log.priority === 'Critical').length;
    const avgEfficiency = logs.length > 0 ? 
      (logs.reduce((sum, log) => sum + (log.energy_efficiency_rating || 3), 0) / logs.length).toFixed(1) : 0;

    return [
      { label: 'TOTAL RECORDS', value: total.toString(), subtitle: 'All maintenance records', icon: FileText },
      { label: 'SCHEDULED', value: scheduled.toString(), subtitle: 'Awaiting service', icon: Calendar },
      { label: 'IN PROGRESS', value: inProgress.toString(), subtitle: 'Currently being serviced', icon: Settings },
      { label: 'COMPLETED', value: completed.toString(), subtitle: 'Successfully completed', icon: CheckCircle },
      { label: 'OVERDUE', value: overdue.toString(), subtitle: 'Past due date', icon: AlertTriangle },
      { label: 'PPM ACTIVITIES', value: ppmCount.toString(), subtitle: 'Preventive maintenance', icon: CheckSquare },
      { label: 'CRITICAL PRIORITY', value: criticalCount.toString(), subtitle: 'High priority items', icon: AlertCircle },
      { label: 'AVG EFFICIENCY', value: `${avgEfficiency}/5`, subtitle: 'Energy efficiency rating', icon: Settings }
    ];
  };

  // Helper function to get record type badge color
  const getRecordTypeBadge = (recordType) => {
    const colors = {
      'PPM (Preventative)': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Corrective Maintenance': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Inspection': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Emergency Repair': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      'Routine Check': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
    };
    
    return colors[recordType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  // Helper function to get status badge color
  const getStatusBadge = (status) => {
    const colors = {
      'Scheduled': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'On Hold': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
      'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format time for display
  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <StatsGrid stats={getMaintenanceStats()} />
      
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {history.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.action_type}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {formatDateTime(item.action_date)} • {item.performed_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Compliance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {config.complianceStandards.map((standard, index) => {
                const standardCount = logs.filter(log => log.compliance_standard === standard).length;
                const percentage = logs.length > 0 ? (standardCount / logs.length * 100).toFixed(1) : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{standard}</span>
                      <span className="text-gray-600 dark:text-gray-400">{standardCount} records ({percentage}%)</span>
                    </div>
                    <Progress value={parseFloat(percentage)} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderMaintenanceRecords = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Building Toggle Navigation - Updated with debug and better visual feedback */}
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Buildings:</p>
              {availableBuildings.map(building => {
                const isSelected = selectedBuilding === building;
                const recordCount = building === "All" ? logs.length : 
                  logs.filter(log => log.building && 
                    (log.building === building || 
                     log.building.toLowerCase() === building.toLowerCase() ||
                     log.building.toLowerCase().includes(building.toLowerCase()) ||
                     building.toLowerCase().includes(log.building.toLowerCase())
                    )
                  ).length;
                
                return (
                  <Button
                    key={building}
                    onClick={() => {
                      setSelectedBuilding(building);
                      debugFilters(); // Debug log
                    }}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={`${
                      isSelected 
                        ? 'bg-[var(--accent)] text-white shadow-md' 
                        : 'dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {building}
                    <span className="ml-1 text-xs opacity-75">({recordCount})</span>
                  </Button>
                );
              })}
            </div>

            {/* Status Filter - Updated with record counts */}
            <div className="flex flex-wrap gap-2 items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 self-center mr-2">Status:</p>
              {config.statusOptions.map(status => {
                const isSelected = selectedStatus === status;
                const recordCount = status === "All" ? logs.length : // Shows total logs for "All" status button
                  logs.filter(log => log.status === status).length;
                
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

            {/* Clear Filters Button */}
            {(selectedBuilding !== "All" || selectedStatus !== "All" || searchTerm !== "") && (
              <Button
                onClick={() => {
                  setSelectedBuilding("All");
                  setSelectedStatus("All");
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
          {(selectedBuilding !== "All" || selectedStatus !== "All" || searchTerm !== "") && (
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Showing {filteredLogs.length} of {logs.length} records
                {selectedBuilding !== "All" && ` • Building: ${selectedBuilding}`}
                {selectedStatus !== "All" && ` • Status: ${selectedStatus}`}
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
              placeholder="Search maintenance records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Records Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-900 dark:text-white">Loading HVAC records...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="p-5 flex-grow">
                  <div className="flex justify-between items-start mb-3">
                    <Badge className={`${getRecordTypeBadge(log.record_type)} border-transparent`}>
                      {log.record_type}
                    </Badge>
                    <Badge className={`${getStatusBadge(log.status)} border-transparent ml-2`}>
                      {log.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.date)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <p className="font-semibold text-lg text-gray-900 dark:text-white">{log.building}</p>
                    {/* Debug info - can be removed later */}
                    <span className="text-xs text-gray-400">
                      {log.building === selectedBuilding ? '✓' : ''}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {log.main_system} - {log.equipment}
                  </p>
                  
                  {log.contractor_company && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Company: {log.contractor_company}
                    </p>
                  )}
                  
                  {log.compliance_standard && (
                    <div className="flex items-center gap-1 mb-3">
                      <CheckSquare className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">{log.compliance_standard}</span>
                    </div>
                  )}
                  
                  {log.common_issues && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Issues:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                        {log.common_issues}
                      </p>
                    </div>
                  )}
                  
                  {log.work_performed && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Work Done:</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {log.work_performed}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-3 flex justify-between items-center rounded-b-lg">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Tech: {log.technician || 'Not assigned'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openModal(log)}
                      className="text-xs h-7 px-2 dark:bg-gray-600 dark:text-white dark:border-gray-500"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteRecord(log.id)}
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
      {filteredLogs.length === 0 && !isLoading && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No HVAC maintenance records found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {selectedBuilding !== "All" || selectedStatus !== "All" || searchTerm !== ""
                ? "Try adjusting your filters or search terms" 
                : "Start by adding your first maintenance record"}
            </p>
            {(selectedBuilding !== "All" || selectedStatus !== "All" || searchTerm !== "") && (
              <Button
                onClick={() => {
                  setSelectedBuilding("All");
                  setSelectedStatus("All");
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

  const renderHistory = () => (
    <Card className="bg-white dark:bg-gray-800 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white">Maintenance Activity History</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">Complete audit trail of all maintenance activities</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <TableHead className="text-gray-900 dark:text-white">Date & Time</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Action Type</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Equipment</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Performed By</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Role</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Status Change</TableHead>
                <TableHead className="text-gray-900 dark:text-white">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record, index) => (
                <TableRow key={index} className="text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(record.action_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {record.action_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.equipment_id}</TableCell>
                  <TableCell>{record.performed_by}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {record.user_role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.old_status && record.new_status && (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge className="bg-gray-100 text-gray-700">
                          {record.old_status}
                        </Badge>
                        <span>→</span>
                        <Badge className="bg-blue-100 text-blue-700">
                          {record.new_status}
                        </Badge>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.description}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-900 dark:text-white">Loading HVAC system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">HVAC Maintenance Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Professional maintenance tracking system with international compliance standards
          </p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => openModal()} 
              className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Maintenance Record
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingLog ? 'Edit Maintenance Record' : 'Add New Maintenance Record'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={saveRecord} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="technical">Technical Details</TabsTrigger>
                  <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  <TabsTrigger value="notes">Notes & Attachments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Building *
                      </label>
                      <Select 
                        value={formData.building} 
                        onValueChange={(value) => setFormData({...formData, building: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select building" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.buildingOptions.filter(b => b !== "All").map(building => (
                            <SelectItem key={building} value={building}>{building}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Record Type *
                      </label>
                      <Select 
                        value={formData.record_type} 
                        onValueChange={(value) => setFormData({...formData, record_type: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select record type" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.recordTypes.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Status
                      </label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value) => setFormData({...formData, status: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.statusOptions.filter(s => s !== "All").map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Priority
                      </label>
                      <Select 
                        value={formData.priority} 
                        onValueChange={(value) => setFormData({...formData, priority: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.priorityOptions.map(priority => (
                            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Service Date *
                      </label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Next Service Date
                      </label>
                      <Input
                        type="date"
                        value={formData.next_service_date}
                        onChange={(e) => setFormData({...formData, next_service_date: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Start Time
                      </label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        End Time
                      </label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="technical" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Main System *
                      </label>
                      <Input
                        type="text"
                        value={formData.main_system}
                        onChange={(e) => setFormData({...formData, main_system: e.target.value})}
                        placeholder="e.g., Chiller, BMS, AHU"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Equipment *
                      </label>
                      <Input
                        type="text"
                        value={formData.equipment}
                        onChange={(e) => setFormData({...formData, equipment: e.target.value})}
                        placeholder="e.g., Trane CVHF-100"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Equipment ID
                      </label>
                      <Input
                        type="text"
                        value={formData.equipment_id}
                        onChange={(e) => setFormData({...formData, equipment_id: e.target.value})}
                        placeholder="Auto-generated if empty"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Technician
                      </label>
                      <Input
                        type="text"
                        value={formData.technician}
                        onChange={(e) => setFormData({...formData, technician: e.target.value})}
                        placeholder="e.g., Ahmed Al-Rashid"
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Contractor/AMC Company
                      </label>
                      <Input
                        type="text"
                        value={formData.contractor_company}
                        onChange={(e) => setFormData({...formData, contractor_company: e.target.value})}
                        placeholder="e.g., ABC Maintenance Co."
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Energy Efficiency Rating (1-5)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.energy_efficiency_rating}
                        onChange={(e) => setFormData({...formData, energy_efficiency_rating: parseInt(e.target.value)})}
                        className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Parts Replaced
                    </label>
                    <Textarea
                      value={formData.parts_replaced}
                      onChange={(e) => setFormData({...formData, parts_replaced: e.target.value})}
                      placeholder="List parts replaced during maintenance"
                      className="h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="compliance" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Compliance Standard
                      </label>
                      <Select 
                        value={formData.compliance_standard} 
                        onValueChange={(value) => setFormData({...formData, compliance_standard: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select standard" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.complianceStandards.map(standard => (
                            <SelectItem key={standard} value={standard}>{standard}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                        Warranty Status
                      </label>
                      <Select 
                        value={formData.warranty_status} 
                        onValueChange={(value) => setFormData({...formData, warranty_status: value})}
                      >
                        <SelectTrigger className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                          <SelectValue placeholder="Select warranty status" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-white">
                          {config.warrantyStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      id="safety_check"
                      type="checkbox"
                      checked={formData.safety_check_passed}
                      onChange={(e) => setFormData({...formData, safety_check_passed: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="safety_check" className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Safety inspection passed
                    </label>
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Issues Identified
                    </label>
                    <Textarea
                      value={formData.common_issues}
                      onChange={(e) => setFormData({...formData, common_issues: e.target.value})}
                      placeholder="Describe issues found during inspection/maintenance"
                      className="h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Work Performed
                    </label>
                    <Textarea
                      value={formData.work_performed}
                      onChange={(e) => setFormData({...formData, work_performed: e.target.value})}
                      placeholder="Describe work performed during this maintenance"
                      className="h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                      Additional Notes
                    </label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Additional notes, recommendations, or observations"
                      className="h-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </TabsContent>
              </Tabs>

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
                      {editingLog ? 'Update Record' : 'Create Record'}
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
      {activeTab === 'maintenance' && renderMaintenanceRecords()}
      {activeTab === 'schedule' && (
        <Card className="bg-white dark:bg-gray-800 shadow-sm">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">PPM Schedule Management</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Coming soon - Scheduled maintenance planning and tracking
            </p>
          </CardContent>
        </Card>
      )}
      {activeTab === 'history' && renderHistory()}
    </div>
  );
}

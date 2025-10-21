import React, { useState, useEffect } from "react";
import { Contractor } from "@/lib/entities";
import { Contract } from "@/lib/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, AlertTriangle, FileText, Search, Edit, Save, X, CheckCircle, AlertCircle } from "lucide-react";
import { format, parse } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

import StatsGrid from "@/components/StatsGrid";

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [contractorsData, contractsData] = await Promise.all([
        Contractor.list(),
        Contract.list()
      ]);
      console.log("Contractors loaded:", contractorsData);
      console.log("Contracts loaded:", contractsData);
      setContractors(contractorsData || []);
      setContracts(contractsData || []);
    } catch (error) {
      console.error("Error loading contractor data:", error);
      setErrorMessage("Failed to load contractor data");
    }
    setIsLoading(false);
  };

  const startEditing = (contract) => {
    setEditingId(contract.id);
    setEditData({
      service_provided: contract.service_provided || "",
      status: contract.status || "active",
      type: contract.type || "contract",
      start_date: contract.start_date || "",
      end_date: contract.end_date || "",
      annual_value: contract.annual_value || 0,
      notes: contract.notes || ""
    });
    setErrorMessage("");
    setSuccessMessage("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
    setErrorMessage("");
  };

  const saveChanges = async () => {
    if (!editingId) return;
    
    setSaving(true);
    setErrorMessage("");
    
    try {
      // Validate required fields
      if (!editData.service_provided?.trim()) {
        throw new Error("Service provided is required");
      }

      // Convert annual_value to number
      const updatedData = {
        ...editData,
        annual_value: parseFloat(editData.annual_value) || 0
      };

      await Contract.update(editingId, updatedData);
      
      // Update local state
      setContracts(contracts.map(contract => 
        contract.id === editingId ? { ...contract, ...updatedData } : contract
      ));
      
      setEditingId(null);
      setEditData({});
      setSuccessMessage("Contract updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error updating contract:", error);
      setErrorMessage(error.message || "Failed to update contract");
      setTimeout(() => setErrorMessage(""), 5000);
    }
    setSaving(false);
  };
  
  const getContractorStats = () => {
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const expiredContracts = contracts.filter(c => c.status === 'expired').length;
    const totalValue = contracts.reduce((sum, c) => sum + (parseFloat(c.annual_value) || 0), 0);

    return [
      { label: 'TOTAL CONTRACTS', value: totalContracts.toString(), subtitle: 'All registered contracts', icon: FileText },
      { label: 'ACTIVE CONTRACTS', value: activeContracts.toString(), subtitle: 'Currently ongoing', icon: Users },
      { label: 'EXPIRED CONTRACTS', value: expiredContracts.toString(), subtitle: 'Past due date', icon: AlertTriangle },
      { label: 'TOTAL ANNUAL VALUE', value: `${totalValue.toLocaleString('en-US', {maximumFractionDigits: 0})} OMR`, subtitle: 'Sum of yearly values', icon: DollarSign }
    ];
  };

  const getContractorName = (contractorId) => {
    if (!contractorId) return 'Unknown Contractor';
    
    const contractor = contractors.find(c => c.id === contractorId);
    return contractor?.name || `Contractor ID: ${contractorId}`;
  };

  const filteredContracts = contracts.filter(contract => {
    const contractorName = getContractorName(contract.contractor_id);
    const serviceProvided = contract.service_provided || '';
    
    const matchesSearch = 
      contractorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serviceProvided.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    const matchesType = typeFilter === 'all' || contract.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      expired: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <Badge className={`${config} border-transparent`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr.toLowerCase() === 'n/a' || dateStr.includes('#')) return 'N/A';
    try {
      // Try to parse as ISO date first (YYYY-MM-DD)
      if (dateStr.includes('-') && dateStr.length === 10) {
        const d = new Date(dateStr + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          return format(d, 'MMM d, yyyy');
        }
      }
      
      // Try to parse as MM/DD/YYYY
      const parsedDate = parse(dateStr, 'M/d/yyyy', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'MMM d, yyyy');
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-900 dark:text-white">Loading contractor data...</p>
      </div>
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

        <StatsGrid stats={getContractorStats()} />
        
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
                <div className="relative flex-1 w-full lg:max-w-xs">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search Contractor/Service" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Filter by Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full lg:w-48 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <SelectValue placeholder="Filter by Type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:text-white">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="service_agreement">Service Agreement</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white w-full lg:w-auto"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              Contracts ({filteredContracts.length} of {contracts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <TableHead className="dark:text-white">Contractor</TableHead>
                    <TableHead className="dark:text-white">Service Provided</TableHead>
                    <TableHead className="dark:text-white">Status</TableHead>
                    <TableHead className="dark:text-white">Type</TableHead>
                    <TableHead className="dark:text-white">Start</TableHead>
                    <TableHead className="dark:text-white">End</TableHead>
                    <TableHead className="dark:text-white">Annual Value (OMR)</TableHead>
                    <TableHead className="dark:text-white">Notes</TableHead>
                    <TableHead className="dark:text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan="9" className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No contracts found matching your criteria
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => (
                      <TableRow key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300">
                        <TableCell className="font-medium">
                          {getContractorName(contract.contractor_id)}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <Input
                              value={editData.service_provided}
                              onChange={(e) => setEditData({...editData, service_provided: e.target.value})}
                              className="min-w-[200px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Enter service provided"
                            />
                          ) : (
                            contract.service_provided || 'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
                              <SelectTrigger className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-800 dark:text-white">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            getStatusBadge(contract.status)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <Select value={editData.type} onValueChange={(value) => setEditData({...editData, type: value})}>
                              <SelectTrigger className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-800 dark:text-white">
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="service_agreement">Service Agreement</SelectItem>
                                <SelectItem value="maintenance">Maintenance</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className="dark:border-gray-600 dark:text-gray-300">
                              {contract.type?.replace(/_/g, ' ') || 'N/A'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <Input
                              type="date"
                              value={editData.start_date}
                              onChange={(e) => setEditData({...editData, start_date: e.target.value})}
                              className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          ) : (
                            formatDate(contract.start_date)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <Input
                              type="date"
                              value={editData.end_date}
                              onChange={(e) => setEditData({...editData, end_date: e.target.value})}
                              className="w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          ) : (
                            formatDate(contract.end_date)
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-right">
                          {editingId === contract.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editData.annual_value}
                              onChange={(e) => setEditData({...editData, annual_value: e.target.value})}
                              className="w-32 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="0.00"
                            />
                          ) : (
                            (parseFloat(contract.annual_value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400 max-w-xs">
                          {editingId === contract.id ? (
                            <Textarea
                              value={editData.notes}
                              onChange={(e) => setEditData({...editData, notes: e.target.value})}
                              className="min-h-[80px] dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Add notes..."
                            />
                          ) : (
                            <div className="truncate" title={contract.notes}>
                              {contract.notes || 'N/A'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === contract.id ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={saveChanges}
                                disabled={saving}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                {saving ? "Saving..." : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                disabled={saving}
                                className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                              >
                                <X className="w-4 h-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => startEditing(contract)}
                              className="bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
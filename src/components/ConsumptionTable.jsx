import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ConsumptionTable({ data }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + rowsPerPage);

  const totals = data.reduce(
    (acc, day) => {
      acc.totalBulk += day.bulk;
      acc.totalIndividual += day.individual;
      acc.totalLoss += day.loss;
      return acc;
    },
    { totalBulk: 0, totalIndividual: 0, totalLoss: 0 }
  );

  const overallLossPercent = totals.totalBulk > 0 ? (totals.totalLoss / totals.totalBulk) * 100 : 0;

  const getStatusBadge = (status, loss) => {
    if (loss < 0) {
      return <Badge className="bg-green-100 text-green-800 border-transparent">Gain</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-transparent">Loss</Badge>;
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Daily Meters Reading
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Detailed daily consumption data with loss analysis
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Bulk Meter (m³)
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Individual Meters (m³)
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Water Loss (m³)
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((day) => (
                <tr key={day.day} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    {day.date}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {day.bulk.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {day.individual.toFixed(2)}
                  </td>
                  <td className={`py-3 px-4 text-right font-semibold ${
                    day.loss < 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {day.loss.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(day.status, day.loss)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td className="py-3 px-4 font-bold text-gray-700 dark:text-gray-300 uppercase text-sm">
                  Total
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-700 dark:text-gray-300">
                  {totals.totalBulk.toLocaleString('en-US', { maximumFractionDigits: 2 })} m³
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-700 dark:text-gray-300">
                  {totals.totalIndividual.toLocaleString('en-US', { maximumFractionDigits: 2 })} m³
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-700 dark:text-gray-300">
                  {totals.totalLoss.toLocaleString('en-US', { maximumFractionDigits: 2 })} m³ ({overallLossPercent.toFixed(1)}%)
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, data.length)} of {data.length} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="dark:bg-gray-700 dark:border-gray-600"
              >
                <ChevronLeft className="w-4 h-4" />
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
                          ? 'bg-teal-600 text-white'
                          : 'dark:bg-gray-700 dark:border-gray-600'
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
                className="dark:bg-gray-700 dark:border-gray-600"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
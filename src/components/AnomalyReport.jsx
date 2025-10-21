
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from "lucide-react";

export default function AnomalyReport({ data, zoneName }) {
  const detectAnomalies = () => {
    // Calculate statistics for loss
    const losses = data.map(d => d.loss);
    const individuals = data.map(d => d.individual);
    
    const losseMean = losses.reduce((sum, val) => sum + val, 0) / losses.length;
    const lossVariance = losses.reduce((sum, val) => sum + Math.pow(val - losseMean, 2), 0) / losses.length;
    const lossStdDev = Math.sqrt(lossVariance);
    
    const indivMean = individuals.reduce((sum, val) => sum + val, 0) / individuals.length;
    const indivVariance = individuals.reduce((sum, val) => sum + Math.pow(val - indivMean, 2), 0) / individuals.length;
    const indivStdDev = Math.sqrt(indivVariance);
    
    const threshold = 2; // 2 standard deviations
    const anomalies = [];
    
    data.forEach(day => {
      // High loss anomaly
      if (Math.abs(day.loss - losseMean) > threshold * lossStdDev && day.loss > losseMean) {
        anomalies.push({
          type: 'high_loss',
          day: day.day,
          date: day.date,
          value: day.loss,
          average: losseMean,
          description: `Water loss of ${day.loss.toFixed(1)} m³ was significantly higher than the average of ${losseMean.toFixed(1)} m³.`
        });
      }
      
      // High consumption anomaly
      if (Math.abs(day.individual - indivMean) > threshold * indivStdDev && day.individual > indivMean) {
        anomalies.push({
          type: 'high_consumption',
          day: day.day,
          date: day.date,
          value: day.individual,
          average: indivMean,
          description: `Individual consumption of ${day.individual.toFixed(1)} m³ was significantly higher than the average of ${indivMean.toFixed(1)} m³.`
        });
      }
    });
    
    return anomalies;
  };

  const anomalies = detectAnomalies();

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          Anomaly Detection Report
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Automated analysis of unusual patterns in {zoneName.replace(/_/g, " ")}
        </p>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                No Anomalies Detected
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                All daily readings are within normal statistical ranges.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div 
                key={index}
                className={`border-l-4 p-4 rounded-r-lg ${
                  anomaly.type === 'high_loss' 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                    anomaly.type === 'high_loss' ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div>
                    <p className={`font-medium ${
                      anomaly.type === 'high_loss' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                    }`}>
                      {anomaly.type === 'high_loss' ? 'High Water Loss' : 'High Consumption'} - {anomaly.date}
                    </p>
                    <p className={`text-sm ${
                      anomaly.type === 'high_loss' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                    }`}>
                      {anomaly.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

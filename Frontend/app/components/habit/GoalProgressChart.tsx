import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import Svg, { Rect, Line, Circle, Polyline } from 'react-native-svg';

interface CheckInData {
  date: string;
  completed: boolean;
  value?: number;
}

interface GoalProgressChartProps {
  habitId: string;
  userId: string;
  goalType: string;
  targetValue?: number;
  goalProgress?: number;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth * 0.85;
const chartHeight = 160;
const padding = 20;

export default function GoalProgressChart({
  habitId,
  userId,
  goalType,
  targetValue,
  goalProgress
}: GoalProgressChartProps) {
  const [loading, setLoading] = useState(true);
  const [checkInData, setCheckInData] = useState<CheckInData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCheckInHistory();
  }, [habitId, userId]);

  const fetchCheckInHistory = async () => {
    try {
      const token = await (await import('@react-native-async-storage/async-storage')).default.getItem('access_token');
      const { BASE_URL } = await import('../../../config');
      
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Fetch a longer period (90 days) to have more data to work with
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const response = await fetch(
        `${BASE_URL}/api/habits/${habitId}/logs?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}&user_id=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (response.ok) {
        const logs = await response.json();
        console.log('📊 Fetched logs:', logs.length, 'total');
        const completedLogs = logs.filter((log: any) => log.completed);
        console.log('✅ Completed logs:', completedLogs.length);
        console.log('📅 Sample log:', completedLogs[0]);
        setCheckInData(completedLogs);
      } else {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        setError(`Failed to load check-in history: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching check-in history:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="h-40 justify-center items-center">
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="h-40 justify-center items-center">
        <Text className="text-white/50 text-sm">{error}</Text>
      </View>
    );
  }

  if (checkInData.length === 0) {
    return (
      <View className="h-40 justify-center items-center">
        <Text className="text-white/50 text-sm">No check-in data available</Text>
        <Text className="text-white/30 text-xs mt-2">Check the console for details</Text>
      </View>
    );
  }

  // Prepare data for chart
  // Group by date and calculate cumulative progress
  const dataByDate: { [key: string]: { count: number; value: number } } = {};
  
  checkInData.forEach((log) => {
    // Handle both ISO date strings (YYYY-MM-DD) and datetime strings (YYYY-MM-DDTHH:mm:ss)
    let dateKey: string;
    if (typeof log.date === 'string') {
      dateKey = log.date.split('T')[0]; // Extract just the date part
    } else {
      // If it's already a Date object or something else, convert it
      dateKey = new Date(log.date).toISOString().split('T')[0];
    }
    
    if (!dataByDate[dateKey]) {
      dataByDate[dateKey] = { count: 0, value: 0 };
    }
    dataByDate[dateKey].count += 1;
    if (log.value !== undefined && log.value !== null) {
      dataByDate[dateKey].value += Number(log.value) || 0;
    }
  });
  
  console.log('📊 Data by date:', Object.keys(dataByDate).length, 'unique dates');

  // Sort dates and calculate cumulative values
  const sortedDates = Object.keys(dataByDate).sort();
  
  if (sortedDates.length === 0) {
    return (
      <View className="h-40 justify-center items-center">
        <Text className="text-white/50 text-sm">No check-in data available</Text>
      </View>
    );
  }

  // Calculate time span
  const firstDate = new Date(sortedDates[0]);
  const lastDate = new Date(sortedDates[sortedDates.length - 1]);
  const daysSpan = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalCheckIns = Object.values(dataByDate).reduce((sum, day) => sum + day.count, 0);

  // Determine optimal period and grouping strategy
  let displayData: { date: string; value: number }[] = [];
  let periodLabel = '';
  let groupBy: 'day' | 'week' | 'month' = 'day';

  // Strategy: Choose period based on data density and time span
  if (totalCheckIns <= 10 || sortedDates.length <= 7) {
    // Very few check-ins: show all
    groupBy = 'day';
    displayData = sortedDates.map(date => ({
      date,
      value: dataByDate[date].count
    }));
    periodLabel = `${totalCheckIns} check-in${totalCheckIns !== 1 ? 's' : ''}`;
  } else if (daysSpan <= 14) {
    // Recent activity (within 2 weeks): show daily
    groupBy = 'day';
    displayData = sortedDates.map(date => ({
      date,
      value: dataByDate[date].count
    }));
    periodLabel = `Last ${daysSpan} days`;
  } else if (daysSpan <= 60) {
    // Medium span (2-8 weeks): show weekly aggregation
    groupBy = 'week';
    const weeklyData: { [key: string]: { count: number; value: number } } = {};
    
    sortedDates.forEach(date => {
      const d = new Date(date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { count: 0, value: 0 };
      }
      weeklyData[weekKey].count += dataByDate[date].count;
      weeklyData[weekKey].value += dataByDate[date].value;
    });
    
    const weeklyDates = Object.keys(weeklyData).sort();
    displayData = weeklyDates.map(date => ({
      date,
      value: weeklyData[date].count
    }));
    periodLabel = `Last ${Math.ceil(daysSpan / 7)} weeks`;
  } else {
    // Long span (2+ months): show monthly aggregation
    groupBy = 'month';
    const monthlyData: { [key: string]: { count: number; value: number } } = {};
    
    sortedDates.forEach(date => {
      const d = new Date(date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { count: 0, value: 0 };
      }
      monthlyData[monthKey].count += dataByDate[date].count;
      monthlyData[monthKey].value += dataByDate[date].value;
    });
    
    const monthlyDates = Object.keys(monthlyData).sort();
    displayData = monthlyDates.map(date => ({
      date,
      value: monthlyData[date].count
    }));
    periodLabel = `Last ${Math.ceil(daysSpan / 30)} months`;
  }

  // Calculate cumulative progress from original daily data
  // First, calculate cumulative values for all dates
  let cumulativeCount = 0;
  let cumulativeValue = 0;
  const cumulativeByDate: { [key: string]: { count: number; value: number; progress: number } } = {};
  
  sortedDates.forEach(date => {
    cumulativeCount += dataByDate[date].count;
    cumulativeValue += dataByDate[date].value;
    
    let progress = 0;
    if (goalType === 'completion' && targetValue !== undefined) {
      progress = (cumulativeValue / targetValue) * 100;
    } else {
      progress = cumulativeCount;
    }
    
    cumulativeByDate[date] = {
      count: cumulativeCount,
      value: cumulativeValue,
      progress
    };
  });
  
  // Now map display data to cumulative values
  const chartData = displayData.map((item) => {
    if (groupBy === 'day') {
      return cumulativeByDate[item.date].progress;
    } else if (groupBy === 'week') {
      // Find the last date in this week to get cumulative value
      const weekStart = new Date(item.date);
      const datesInWeek = sortedDates.filter(d => {
        const date = new Date(d);
        const weekStartDate = new Date(date);
        weekStartDate.setDate(date.getDate() - date.getDay());
        return weekStartDate.toISOString().split('T')[0] === item.date;
      });
      if (datesInWeek.length > 0) {
        const lastDateInWeek = datesInWeek[datesInWeek.length - 1];
        return cumulativeByDate[lastDateInWeek].progress;
      }
      return 0;
    } else if (groupBy === 'month') {
      // Find the last date in this month to get cumulative value
      const [year, month] = item.date.split('-');
      const datesInMonth = sortedDates.filter(d => {
        const date = new Date(d);
        return date.getFullYear() === parseInt(year) && date.getMonth() + 1 === parseInt(month);
      });
      if (datesInMonth.length > 0) {
        const lastDateInMonth = datesInMonth[datesInMonth.length - 1];
        return cumulativeByDate[lastDateInMonth].progress;
      }
      return 0;
    }
    return 0;
  });

  if (chartData.length === 0) {
    return (
      <View className="h-40 justify-center items-center">
        <Text className="text-white/50 text-sm">No data to display</Text>
      </View>
    );
  }

  // Limit to max 30 data points for readability
  let finalData = chartData;
  let finalDates = displayData.map(d => d.date);
  let skipFactor = 1;
  
  if (chartData.length > 30) {
    skipFactor = Math.ceil(chartData.length / 30);
    finalData = chartData.filter((_, i) => i % skipFactor === 0 || i === chartData.length - 1);
    finalDates = finalDates.filter((_, i) => i % skipFactor === 0 || i === finalDates.length - 1);
  }

  // Normalize data to 0-100 for display
  const maxValue = Math.max(...finalData, 1);
  const normalizedData = finalData.map(val => (val / maxValue) * 100);

  // Calculate positions for line chart
  const graphWidth = chartWidth - (padding * 2);
  const graphHeight = chartHeight - (padding * 2);
  const stepX = graphWidth / (finalData.length - 1 || 1);
  const points: string[] = [];

  finalData.forEach((value, index) => {
    const normalized = normalizedData[index];
    const x = padding + (index * stepX);
    const y = padding + graphHeight - (normalized / 100) * graphHeight;
    points.push(`${x},${y}`);
  });

  // Generate date labels based on grouping strategy
  const formatDateLabel = (dateStr: string, group: 'day' | 'week' | 'month'): string => {
    const d = new Date(dateStr);
    switch (group) {
      case 'day':
        return `${d.getMonth() + 1}/${d.getDate()}`;
      case 'week':
        const weekEnd = new Date(d);
        weekEnd.setDate(d.getDate() + 6);
        return `${d.getMonth() + 1}/${d.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
      case 'month':
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  };

  const dateLabels = finalDates.map(date => formatDateLabel(date, groupBy));
  
  // Show labels intelligently based on data points
  let visibleLabels: string[] = [];
  let labelIndices: number[] = [];
  
  if (dateLabels.length <= 7) {
    // Show all labels if 7 or fewer
    visibleLabels = dateLabels;
    labelIndices = dateLabels.map((_, i) => i);
  } else if (dateLabels.length <= 15) {
    // Show every other label
    visibleLabels = dateLabels.filter((_, i) => i % 2 === 0);
    labelIndices = dateLabels.map((_, i) => i).filter(i => i % 2 === 0);
  } else {
    // Show 7 evenly distributed labels
    const step = Math.floor(dateLabels.length / 7);
    for (let i = 0; i < dateLabels.length; i += step) {
      visibleLabels.push(dateLabels[i]);
      labelIndices.push(i);
    }
    // Always include the last label
    if (labelIndices[labelIndices.length - 1] !== dateLabels.length - 1) {
      visibleLabels.push(dateLabels[dateLabels.length - 1]);
      labelIndices.push(dateLabels.length - 1);
    }
  }

  return (
    <View className="w-full items-center">
      <Svg width={chartWidth} height={chartHeight}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent, i) => {
          const y = padding + graphHeight - (percent / 100) * graphHeight;
          return (
            <Line
              key={`grid-${i}`}
              x1={padding}
              y1={y}
              x2={chartWidth - padding}
              y2={y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Line path using Polyline */}
        {points.length > 1 && (
          <Polyline
            points={points.join(' ')}
            fill="none"
            stroke="#C9B0E8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((point, index) => {
          const [x, y] = point.split(',').map(Number);
          return (
            <Circle
              key={`point-${index}`}
              cx={x}
              cy={y}
              r="4"
              fill="#C9B0E8"
              stroke="#ffffff"
              strokeWidth="1"
            />
          );
        })}
      </Svg>
      
      {/* Date labels with proper spacing */}
      <View className="flex-row justify-between w-full px-4 mt-2" style={{ position: 'relative' }}>
        {labelIndices.map((labelIndex, idx) => {
          const position = (labelIndex / (dateLabels.length - 1 || 1)) * 100;
          return (
            <View
              key={idx}
              style={{
                position: 'absolute',
                left: `${position}%`,
                transform: [{ translateX: -20 }], // Center the label
              }}
            >
              <Text className="text-white/50 text-[10px]" style={{ textAlign: 'center', minWidth: 40 }}>
                {visibleLabels[idx]}
              </Text>
            </View>
          );
        })}
      </View>
      
      <Text className="text-white/70 text-xs text-center mt-2">
        {periodLabel} • {totalCheckIns} total check-ins
      </Text>
    </View>
  );
}


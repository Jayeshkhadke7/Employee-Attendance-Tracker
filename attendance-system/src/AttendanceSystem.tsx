import { useState, useEffect, useRef } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Button } from "components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from 'components/ui/Card';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/Label';
import 'jspdf-autotable';
import { Clock, User, Home, Check, X, Download, Plus, BarChart2, PieChart } from 'lucide-react';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

type Employee = {
  id: number;
  name: string;
  position: string;
  department: string;
  joinDate: string;
};

type AttendanceRecord = {
  id: number;
  employeeId: number;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  status: 'present' | 'absent' | 'half-day' | 'late';
};

export default function AttendanceSystem() {
  const [activeTab, setActiveTab] = useState<'attendance' | 'employees' | 'reports'>('attendance');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);

  // Camera state and refs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Start with empty employees and attendance arrays
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const savedEmployees = localStorage.getItem('employees');
    return savedEmployees ? JSON.parse(savedEmployees) : [];
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const savedAttendance = localStorage.getItem('attendance');
    return savedAttendance ? JSON.parse(savedAttendance) : [];
  });

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    position: '',
    department: '',
    joinDate: '',
  });

  const [reportFilter, setReportFilter] = useState({
    employee: '',
    period: 'week',
    date: new Date().toISOString().split('T')[0],
    department: '',
  });

  // Save employees to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('employees', JSON.stringify(employees));
  }, [employees]);

  // Save attendance to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('attendance', JSON.stringify(attendance));
  }, [attendance]);

  // Getting current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split('T')[0];

  // Camera open/close logic
  const openCamera = async () => {
    setIsCameraOpen(true);
    setScanResult(null);
    setIsScanning(false);
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        setScanResult('error');
      }
    }
  };

  const closeCamera = () => {
    setIsCameraOpen(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Capture image from camera and simulate scan
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, 320, 240);
        // Simulate scan after capture
        setIsScanning(true);
        setScanResult(null);
        setTimeout(() => {
          const success = Math.random() > 0.2;
          if (success) {
            setScanResult('success');
            // Find first absent employee for demo purposes
            const absentEmployee = attendance.find(record =>
              record.date === currentDate && record.status === 'absent'
            );
            if (absentEmployee) {
              const now = new Date();
              const timeString = now.toTimeString().split(' ')[0].substring(0, 5);
              setAttendance(attendance.map(record =>
                record.id === absentEmployee.id
                  ? { ...record, punchIn: timeString, status: 'present' }
                  : record
              ));
            }
          } else {
            setScanResult('error');
          }
          setIsScanning(false);
          closeCamera();
        }, 2000);
      }
    }
  };

  // Mark employee as absent
  const markAbsent = (employeeId: number) => {
    setAttendance(attendance.map(record =>
      record.employeeId === employeeId && record.date === currentDate
        ? { ...record, punchIn: null, punchOut: null, status: 'absent' }
        : record
    ));
  };

  // Mark employee as half day
  const markHalfDay = (employeeId: number) => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5);
    setAttendance(attendance.map(record =>
      record.employeeId === employeeId && record.date === currentDate
        ? {
            ...record,
            punchIn: record.punchIn || timeString,
            punchOut: record.punchOut || timeString,
            status: 'half-day',
          }
        : record
    ));
  };

  // Mark employee as present
  const markPresent = (employeeId: number) => {
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0].substring(0, 5);
    setAttendance(attendance.map(record =>
      record.employeeId === employeeId && record.date === currentDate
        ? { ...record, punchIn: timeString, status: 'present' }
        : record
    ));
  };

  // Adding new employees
  const addEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const employee = {
      id: employees.length + 1,
      name: newEmployee.name,
      position: newEmployee.position,
      department: newEmployee.department,
      joinDate: newEmployee.joinDate,
    };
    setEmployees([...employees, employee]);
    // Adding attendance record for new employee
    setAttendance([...attendance, {
      id: attendance.length + 1,
      employeeId: employee.id,
      date: currentDate,
      punchIn: null,
      punchOut: null,
      status: 'absent',
    }]);
    setNewEmployee({ name: '', position: '', department: '', joinDate: '' });
  };

  // Function to generate data for the pie chart
  const getAttendanceDistributionData = () => {
    const summary = calculateSummary(getFilteredAttendance());
    return {
      labels: ['Present', 'Absent', 'Late', 'Half Day'],
      datasets: [
        {
          label: 'Attendance Distribution',
          data: [summary.present, summary.absent, summary.late, summary.halfDay],
          backgroundColor: ['#34D399', '#F87171', '#60A5FA', '#FBBF24'],
          borderColor: ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'],
          borderWidth: 1,
        },
      ],
    };
  };

  const downloadReport = () => {
    const headers = ['Employee Name', 'Department', 'Date', 'Punch In', 'Punch Out', 'Status'];
    const rows = attendance.map(record => [
      getEmployeeName(record.employeeId),
      getEmployeeDepartment(record.employeeId),
      record.date,
      record.punchIn || '-',
      record.punchOut || '-',
      record.status,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(value => `"${value}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Get employee name by ID
  const getEmployeeName = (id: number) => {
    return employees.find(emp => emp.id === id)?.name || 'Unknown'
  }

  // Get employee department by ID
  const getEmployeeDepartment = (id: number) => {
    return employees.find(emp => emp.id === id)?.department || 'Unknown'
  }

  // Get today's attendance records
  const todaysAttendance = attendance.filter(record => record.date === currentDate)

  // Get filtered attendance records for reports
  const getFilteredAttendance = () => {
    let filtered = attendance

    if (reportFilter.employee) {
      filtered = filtered.filter(record =>
        getEmployeeName(record.employeeId).toLowerCase().includes(reportFilter.employee.toLowerCase())
      )
    }

    if (reportFilter.department) {
      filtered = filtered.filter(record =>
        getEmployeeDepartment(record.employeeId).toLowerCase().includes(reportFilter.department.toLowerCase())
      )
    }

    if (reportFilter.period === 'day') {
      filtered = filtered.filter(record => record.date === reportFilter.date)
    } else if (reportFilter.period === 'week') {
      const targetDate = new Date(reportFilter.date)
      const weekStart = new Date(targetDate)
      weekStart.setDate(targetDate.getDate() - targetDate.getDay())
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate >= weekStart && recordDate <= weekEnd
      })
    } else if (reportFilter.period === 'month') {
      const [year, month] = reportFilter.date.split('-').slice(0, 2)
      filtered = filtered.filter(record =>
        record.date.startsWith(`${year}-${month}`)
      )
    } else if (reportFilter.period === 'year') {
      const year = reportFilter.date.split('-')[0]
      filtered = filtered.filter(record =>
        record.date.startsWith(`${year}`)
      )
    }

    return filtered
  }

  // Calculate attendance summary
  const calculateSummary = (records: AttendanceRecord[]) => {
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      halfDay: records.filter(r => r.status === 'half-day').length,
      total: records.length
    }
  }

  // Get unique departments
  const departments = Array.from(new Set(employees.map(emp => emp.department)))

  function getAttendanceTrendData(): import("chart.js").ChartData<"pie", number[], unknown> {
    const filteredAttendance = getFilteredAttendance();
    const trendData: { [key: string]: number } = {};

    filteredAttendance.forEach(record => {
      if (!trendData[record.date]) {
        trendData[record.date] = 0;
      }
      trendData[record.date]++;
    });

    const labels = Object.keys(trendData).sort();
    const data = labels.map(date => trendData[date]);

    return {
      labels,
      datasets: [
        {
          label: 'Attendance Trend',
          data,
          backgroundColor: '#60A5FA',
          borderColor: '#3B82F6',
          borderWidth: 1,
        },
      ],
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Attendance Management System</h1>
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6 text-gray-500" />
            <span className="text-sm font-medium">Admin User</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-4 px-6 font-medium text-sm ${activeTab === 'attendance' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Attendance
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-6 font-medium text-sm ${activeTab === 'employees' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Employees
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-6 font-medium text-sm ${activeTab === 'reports' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Reports
          </button>
        </div>

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>Scan face or manually mark attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center h-64 bg-gray-50">
                      {isCameraOpen ? (
                        <div className="flex flex-col items-center">
                          <video ref={videoRef} width={320} height={240} autoPlay className="rounded mb-2" />
                          <canvas ref={canvasRef} width={320} height={240} style={{ display: 'none' }} />
                          <div className="flex gap-2">
                            <Button onClick={captureImage} disabled={isScanning}>
                              {isScanning ? 'Scanning...' : 'Capture & Scan'}
                            </Button>
                            <Button variant="outline" onClick={closeCamera} disabled={isScanning}>
                              Close Camera
                            </Button>
                          </div>
                        </div>
                      ) : isScanning ? (
                        <div className="text-center">
                          <div className="animate-pulse flex space-x-4 mb-4">
                            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                          </div>
                          <p className="text-gray-600">Scanning face...</p>
                        </div>
                      ) : scanResult === 'success' ? (
                        <div className="text-center text-green-600">
                          <Check className="h-12 w-12 mx-auto mb-2" />
                          <p>Attendance marked successfully!</p>
                        </div>
                      ) : scanResult === 'error' ? (
                        <div className="text-center text-red-600">
                          <X className="h-12 w-12 mx-auto mb-2" />
                          <p>Scan failed. Please try again.</p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="bg-gray-200 rounded-full h-24 w-24 mx-auto mb-4"></div>
                          <p className="text-gray-500">Face scanning area</p>
                        </div>
                      )}
                    </div>
                    {!isCameraOpen && (
                      <Button
                        onClick={openCamera}
                        disabled={isScanning}
                        className="w-full mt-4"
                      >
                        Open Camera
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-2">Quick Actions</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => markAbsent(1)}
                      >
                        Mark Absent
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => markHalfDay(1)}
                      >
                        Mark Half Day
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => markPresent(1)}
                      >
                        Mark Present
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance ({currentDate})</CardTitle>
                <CardDescription>Latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch In</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Out</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {todaysAttendance.map((record) => (
                        <tr key={record.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {getEmployeeName(record.employeeId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getEmployeeDepartment(record.employeeId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.punchIn || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.punchOut || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' :
                              record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              record.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markAbsent(record.employeeId)}
                              >
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markHalfDay(record.employeeId)}
                              >
                                Half Day
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => markPresent(record.employeeId)}
                              >
                                Present
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Employee List</CardTitle>
                <CardDescription>Manage your organization's employees</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.position}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.joinDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add New Employee</CardTitle>
                <CardDescription>Fill out the form to add a new employee</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={addEmployee} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        value={newEmployee.position}
                        onChange={(e) => setNewEmployee({...newEmployee, position: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        value={newEmployee.department}
                        onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input
                      id="joinDate"
                      type="date"
                      value={newEmployee.joinDate}
                      onChange={(e) => setNewEmployee({...newEmployee, joinDate: e.target.value})}
                      required
                    />
                  </div>
                  <Button type="submit" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Attendance Reports</CardTitle>
                    <CardDescription>Generate and download attendance reports</CardDescription>
                  </div>
                  <Button onClick={downloadReport} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <Label htmlFor="employee">Employee</Label>
                    <Input
                      id="employee"
                      placeholder="Search employee"
                      value={reportFilter.employee}
                      onChange={(e) => setReportFilter({...reportFilter, employee: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <select
                      id="department"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={reportFilter.department}
                      onChange={(e) => setReportFilter({...reportFilter, department: e.target.value})}
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="period">Time Period</Label>
                    <select
                      id="period"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={reportFilter.period}
                      onChange={(e) => setReportFilter({...reportFilter, period: e.target.value})}
                    >
                      <option value="day">Day</option>
                      <option value="week">Week</option>
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={reportFilter.date}
                      onChange={(e) => setReportFilter({...reportFilter, date: e.target.value})}
                    />
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4 flex items-center">
                      <div className="rounded-full bg-green-100 p-3 mr-4">
                        <Check className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Present</div>
                        <div className="text-2xl font-semibold">
                          {calculateSummary(getFilteredAttendance()).present}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center">
                      <div className="rounded-full bg-red-100 p-3 mr-4">
                        <X className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Absent</div>
                        <div className="text-2xl font-semibold">
                          {calculateSummary(getFilteredAttendance()).absent}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center">
                      <div className="rounded-full bg-blue-100 p-3 mr-4">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Late</div>
                        <div className="text-2xl font-semibold">
                          {calculateSummary(getFilteredAttendance()).late}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 flex items-center">
                      <div className="rounded-full bg-yellow-100 p-3 mr-4">
                        <Home className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-500">Half Day</div>
                        <div className="text-2xl font-semibold">
                          {calculateSummary(getFilteredAttendance()).halfDay}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Attendance Distribution Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2 text-gray-500" />
                        <CardTitle>Attendance Distribution</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-64">
                        <Pie
                          data={getAttendanceDistributionData()}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                position: 'top',
                              },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Attendance Trend Chart */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center">
                        <BarChart2 className="h-5 w-5 mr-2 text-gray-500" />
                        <CardTitle>Attendance Trend</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full h-64">
                        <Pie
                          data={getAttendanceTrendData()}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: {
                                position: 'top',
                              },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Records */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Attendance Records</CardTitle>
                    <CardDescription>
                      Showing {getFilteredAttendance().length} records
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch In</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Out</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFilteredAttendance().map((record) => (
                            <tr key={record.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {getEmployeeName(record.employeeId)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {getEmployeeDepartment(record.employeeId)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.punchIn || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {record.punchOut || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  record.status === 'present' ? 'bg-green-100 text-green-800' :
                                  record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  record.status === 'half-day' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
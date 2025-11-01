"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { date: "Jan 1", sales: 2400, revenue: 9600 },
  { date: "Jan 8", sales: 3210, revenue: 12840 },
  { date: "Jan 15", sales: 2290, revenue: 9160 },
  { date: "Jan 22", sales: 2000, revenue: 8000 },
  { date: "Jan 29", sales: 2181, revenue: 8724 },
  { date: "Feb 5", sales: 2500, revenue: 10000 },
  { date: "Feb 12", sales: 2100, revenue: 8400 },
  { date: "Feb 19", sales: 3800, revenue: 15200 },
]

export function SalesChart() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Tren Penjualan</CardTitle>
        <CardDescription>Penjualan mingguan dan pendapatan selama 8 minggu terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="sales" name="Unit Terjual" fill="#8884d8" stroke="#8884d8" />
              <Area type="monotone" dataKey="revenue" name="Pendapatan ($)" fill="#82ca9d" stroke="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default SalesChart

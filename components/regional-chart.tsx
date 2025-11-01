"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const data = [
  { region: "North", sales: 4000, target: 4500 },
  { region: "South", sales: 3800, target: 4000 },
  { region: "East", sales: 2200, target: 3000 },
  { region: "West", sales: 2780, target: 3500 },
  { region: "Central", sales: 1890, target: 2500 },
]

export default function RegionalChart() {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Kinerja Wilayah</CardTitle>
        <CardDescription>Penjualan vs target menurut wilayah</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sales" fill="#8884d8" name="Penjualan Aktual" />
              <Bar dataKey="target" fill="#82ca9d" name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

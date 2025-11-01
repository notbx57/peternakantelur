"use client"

import DashboardHeader from "@/components/dashboard-header"
import { SalesOverview } from "@/components/sales-overview"
import { SalesChart } from "@/components/sales-chart"
import RegionalChart from "@/components/regional-chart"
import { SalesTable } from "@/components/sales-table"

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <DashboardHeader />

      <div className="mt-8 space-y-8">
        <SalesOverview />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SalesChart />
          <RegionalChart />
        </div>

        <SalesTable />
      </div>
    </main>
  )
}

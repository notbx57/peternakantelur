"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SaleRecord {
  id: string
  product: string
  quantity: number
  revenue: number
  region: string
  date: string
  status: "completed" | "pending" | "shipped"
  predictedValue?: number
}

const initialData: SaleRecord[] = [
  {
    id: "1",
    product: "Telur Segar - Lusin",
    quantity: 120,
    revenue: 1440,
    region: "North",
    date: "2025-11-01",
    status: "completed",
    predictedValue: undefined,
  },
  {
    id: "2",
    product: "Telur Organik Cokelat - Setengah Lusin",
    quantity: 95,
    revenue: 760,
    region: "East",
    date: "2025-10-31",
    status: "completed",
    predictedValue: undefined,
  },
  {
    id: "3",
    product: "Telur Premium Putih - Lusin",
    quantity: 150,
    revenue: 2250,
    region: "South",
    date: "2025-10-31",
    status: "shipped",
    predictedValue: undefined,
  },
  {
    id: "4",
    product: "Telur Segar - Lusin",
    quantity: 200,
    revenue: 2400,
    region: "West",
    date: "2025-10-30",
    status: "completed",
    predictedValue: undefined,
  },
  {
    id: "5",
    product: "Telur Organik Cokelat - Setengah Lusin",
    quantity: 85,
    revenue: 680,
    region: "Central",
    date: "2025-10-30",
    status: "pending",
    predictedValue: undefined,
  },
  {
    id: "6",
    product: "Telur Premium Putih - Lusin",
    quantity: 175,
    revenue: 2625,
    region: "North",
    date: "2025-10-29",
    status: "completed",
    predictedValue: undefined,
  },
]

export function SalesTable() {
  const [data, setData] = useState(initialData)
  const [sortKey, setSortKey] = useState<keyof SaleRecord>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const handleSort = (key: keyof SaleRecord) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("desc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortKey]
    const bVal = b[sortKey]

    if (typeof aVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal)
    }

    if (typeof aVal === "number") {
      return sortDirection === "asc" ? aVal - (bVal as number) : (bVal as number) - aVal
    }

    return 0
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-900/20 text-green-400"
      case "shipped":
        return "bg-blue-900/20 text-blue-400"
      case "pending":
        return "bg-yellow-900/20 text-yellow-400"
      default:
        return "bg-gray-900/20 text-gray-400"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Selesai"
      case "shipped":
        return "Dikirim"
      case "pending":
        return "Tertunda"
      default:
        return status
    }
  }

  const SortButton = ({ label, field }: { label: string; field: keyof SaleRecord }) => (
    <button
      onClick={() => handleSort(field)}
      className="font-medium text-sm hover:text-primary transition-colors flex items-center gap-1"
    >
      {label}
      <span className="text-xs">{sortKey === field ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  )

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle>Penjualan Terbaru</CardTitle>
        <CardDescription>Transaksi penjualan telur terbaru (klik header kolom untuk mengurutkan)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Produk" field="product" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Qty" field="quantity" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Pendapatan" field="revenue" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Nilai Prediksi" field="predictedValue" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Wilayah" field="region" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Tanggal" field="date" />
                </th>
                <th className="text-left py-3 px-4 text-muted-foreground">
                  <SortButton label="Status" field="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row) => (
                <tr key={row.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 text-foreground">{row.product}</td>
                  <td className="py-3 px-4 text-foreground font-medium">{row.quantity}</td>
                  <td className="py-3 px-4 text-foreground font-medium">${row.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {row.predictedValue ? `$${row.predictedValue.toLocaleString()}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{row.region}</td>
                  <td className="py-3 px-4 text-muted-foreground">{row.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(row.status)}`}>
                      {getStatusLabel(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

export default SalesTable
